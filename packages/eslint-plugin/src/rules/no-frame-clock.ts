import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { calleeName, parentOf } from '../lib/ast'
import { stateAccessListener } from '../lib/state'
import { gitHubUrl } from '../lib/url'

const KEYS = new Set(['clock'])

/**
 * `state.clock.elapsedTime` and `state.clock.getElapsedTime()`: the expression to replace with
 * `state.elapsed`, which is the same value in seconds.
 */
function elapsedExpression(member: ESTree.MemberExpression): ESTree.Node | undefined {
  const parent = parentOf(member)
  if (parent?.type !== 'MemberExpression' || parent.object !== member || parent.computed) return undefined
  const name = calleeName(parent)
  if (name === 'elapsedTime') return parent
  const call = parentOf(parent)
  if (name === 'getElapsedTime' && call?.type === 'CallExpression' && call.callee === parent) return call
  return undefined
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    messages: {
      frameClock:
        '`clock` was removed from the frame state in v10. Read `state.elapsed` (seconds since the first frame), ' +
        '`state.delta` (seconds since the last frame) or `state.time` (the frame timestamp) instead.',
      threeClock:
        '`clock` was removed from the root state in v10. Read timing from the useFrame state instead: ' +
        '`elapsed`, `delta` or `time`.',
    },
    docs: {
      url: gitHubUrl('no-frame-clock'),
      recommended: false,
      migration: true,
      description: 'Replace the removed `state.clock` with the frame state timing fields.',
    } as Rule.RuleMetaData['docs'],
    schema: [],
  },
  create(ctx) {
    return stateAccessListener(ctx, KEYS, (access) => {
      if (access.source === 'three') {
        ctx.report({ node: access.node, messageId: 'threeClock' })
        return
      }
      const replace = access.kind === 'member' ? elapsedExpression(access.node) : undefined
      const state = access.kind === 'member' ? ctx.sourceCode.getText(access.node.object) : undefined
      ctx.report({
        node: access.node,
        messageId: 'frameClock',
        fix: replace && state ? (fixer) => fixer.replaceText(replace, `${state}.elapsed`) : null,
      })
    })
  },
}

export default rule
