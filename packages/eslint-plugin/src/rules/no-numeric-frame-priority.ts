import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { calleeName, mergeListeners } from '../lib/ast'
import { trackFiberImports } from '../lib/imports'
import { gitHubUrl } from '../lib/url'

/** The value of `1`, `-1` or `+1`, if `node` is a number literal. */
function numberValue(node: ESTree.Node | undefined): number | undefined {
  if (node?.type === 'Literal' && typeof node.value === 'number') return node.value
  if (node?.type === 'UnaryExpression' && (node.operator === '-' || node.operator === '+')) {
    const value = numberValue(node.argument)
    return value === undefined ? undefined : node.operator === '-' ? -value : value
  }
  return undefined
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    hasSuggestions: true,
    messages: {
      takeover:
        'A positive useFrame priority ({{value}}) is deprecated. It still takes over rendering, so this callback must ' +
        "render the scene. Use `{ phase: 'render' }`, which says so explicitly.",
      reversed:
        'A negative useFrame priority ({{value}}) runs in the opposite order in v10: v9 ran lower numbers first, v10 runs ' +
        "higher numbers first, so this now runs after the default jobs. Use a phase (`{ phase: 'physics' }`) or " +
        "`{ before: 'update' }` to say what it must run before.",
      useRenderPhase: "Replace with { phase: 'render' }",
    },
    docs: {
      url: gitHubUrl('no-numeric-frame-priority'),
      recommended: false,
      migration: true,
      description: 'Replace numeric useFrame priorities, whose meaning changed in v10, with phases.',
    } as Rule.RuleMetaData['docs'],
    schema: [],
  },
  create(ctx) {
    const imports = trackFiberImports()
    return mergeListeners(imports.listener, {
      CallExpression(node: ESTree.CallExpression) {
        const { callee } = node
        const name =
          callee.type === 'Identifier' ? (imports.get(callee.name)?.imported ?? callee.name) : calleeName(callee)
        if (name !== 'useFrame') return
        const priority = node.arguments[1] as ESTree.Node | undefined
        const value = numberValue(priority)
        if (!priority || value === undefined || value === 0) return
        if (value > 0) {
          ctx.report({
            node: priority,
            messageId: 'takeover',
            data: { value: String(value) },
            suggest: [
              { messageId: 'useRenderPhase', fix: (fixer) => fixer.replaceText(priority, "{ phase: 'render' }") },
            ],
          })
        } else {
          ctx.report({ node: priority, messageId: 'reversed', data: { value: String(value) } })
        }
      },
    })
  },
}

export default rule
