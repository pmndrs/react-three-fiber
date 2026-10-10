import type { Rule, Scope } from 'eslint'
import type * as ESTree from 'estree'
import { resolveFunction } from '../lib/ast'
import { gitHubUrl } from '../lib/url'

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
        'useLocalNodes re-runs its creator on every render when no dependency array is passed, even a useCallback one. ' +
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
      description: 'Require a dependency array on useLocalNodes, so the graph is not rebuilt on every render.',
    },
    schema: [],
  },
  create(ctx) {
    return {
      CallExpression(node: ESTree.CallExpression) {
        if (!isUseLocalNodes(node.callee) || node.arguments.length !== 1) return
        const creator = node.arguments[0] as ESTree.Node
        // Inline, or by reference to a function or useCallback: a stable creator identity does not
        // help, since without an array the hook re-runs it on every render either way
        const fn = resolveFunction(ctx, creator)
        if (!fn) return

        const names = capturedNames(ctx.sourceCode.getScope(fn))
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
