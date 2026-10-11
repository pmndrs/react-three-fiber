import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { mergeListeners } from '../lib/ast'
import { trackFiberImports } from '../lib/imports'
import { gitHubUrl } from '../lib/url'

const REPLACEMENTS: Record<string, string> = {
  addEffect: "useFrame(callback, { phase: 'start' })",
  addAfterEffect: "useFrame(callback, { phase: 'finish' })",
  addTail: 'scheduler.onIdle(callback)',
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    messages: {
      deprecated: '`{{name}}` is deprecated in v10 and logs a warning: use `{{replacement}}` instead.',
    },
    docs: {
      url: gitHubUrl('no-deprecated-loop-globals'),
      recommended: false,
      migration: true,
      description: 'Replace the deprecated global loop callbacks with useFrame phases and the scheduler.',
    } as Rule.RuleMetaData['docs'],
    schema: [],
  },
  create(ctx) {
    const imports = trackFiberImports()
    return mergeListeners(imports.listener, {
      CallExpression(node: ESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return
        const name = imports.get(node.callee.name)?.imported
        if (name && name in REPLACEMENTS) {
          ctx.report({ node: node.callee, messageId: 'deprecated', data: { name, replacement: REPLACEMENTS[name] } })
        }
      },
    })
  },
}

export default rule
