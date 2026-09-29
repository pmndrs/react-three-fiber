import type { Rule, Scope } from 'eslint'
import * as ESTree from 'estree'
import { gitHubUrl } from '../lib/url'

type CreatorFunction = ESTree.ArrowFunctionExpression | ESTree.FunctionExpression

function isUseLocalNodes(callee: ESTree.CallExpression['callee']): boolean {
  if (callee.type === 'Identifier') return callee.name === 'useLocalNodes'
  return (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'useLocalNodes'
  )
}

/**
 * Names the creator reads from its component: variables resolved in an enclosing function scope
 * (props, state, locals), not module-level constants, globals or the creator's own parameters.
 */
function capturedNames(creatorScope: Scope.Scope): string[] {
  const names = new Set<string>()
  const visit = (scope: Scope.Scope) => {
    for (const reference of scope.through) {
      const variable = reference.resolved
      if (variable && variable.scope.type === 'function') names.add(variable.name)
    }
  }
  visit(creatorScope)
  return [...names]
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    messages: {
      missingDeps:
        'useLocalNodes re-runs an inline creator on every render when no dependency array is passed. ' +
        'Pass [] so the graph is built once and rebuilt only when a shared resource it reads changes.',
      capturesValues:
        'useLocalNodes re-runs this creator on every render: it has no dependency array and reads {{names}} from the component. ' +
        'Values that change belong in uniforms (useUniforms), which update without rebuilding the graph; then pass []. ' +
        'Declare a value in the array only if it changes the structure of the graph.',
      addEmptyDeps: 'Add an empty dependency array',
    },
    docs: {
      url: gitHubUrl('prefer-local-nodes-deps'),
      recommended: true,
      description:
        'Require a dependency array on useLocalNodes with an inline creator, so the graph is not rebuilt on every render.',
    },
  },
  create(ctx) {
    const sourceCode = ctx.sourceCode ?? ctx.getSourceCode()
    const scopeOf = (node: ESTree.Node) =>
      (sourceCode as { getScope?: (node: ESTree.Node) => Scope.Scope }).getScope?.(node) ?? ctx.getScope()

    return {
      CallExpression(node: ESTree.CallExpression) {
        if (!isUseLocalNodes(node.callee) || node.arguments.length !== 1) return
        const creator = node.arguments[0]
        if (creator.type !== 'ArrowFunctionExpression' && creator.type !== 'FunctionExpression') return

        const names = capturedNames(scopeOf(creator as CreatorFunction))
        if (names.length > 0) {
          ctx.report({
            node,
            messageId: 'capturesValues',
            data: { names: names.map((name) => `\`${name}\``).join(', ') },
          })
          return
        }

        ctx.report({
          node,
          messageId: 'missingDeps',
          suggest: [{ messageId: 'addEmptyDeps', fix: (fixer) => fixer.insertTextAfter(creator, ', []') }],
        })
      },
    }
  },
}

export default rule
