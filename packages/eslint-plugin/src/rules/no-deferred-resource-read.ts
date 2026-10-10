import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { ancestors, calleeName, isFunction, parentOf } from '../lib/ast'
import { creatorOf, keyRead, RESOURCE_KEYS, stateBindings } from '../lib/tsl'
import { gitHubUrl } from '../lib/url'

const USE_LOCAL_NODES = new Set(['useLocalNodes'])

/** Whether `fn` is the body handed to `Fn(...)`, which three runs later while building the shader. */
function isFnBody(fn: ESTree.Node): boolean {
  const parent = parentOf(fn)
  return (
    parent?.type === 'CallExpression' && calleeName(parent.callee) === 'Fn' && parent.arguments.includes(fn as never)
  )
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: {
      deferredRead:
        '`{{key}}` is read inside Fn(), which runs after the creator returns, so useLocalNodes does not track it: replacing ' +
        'the resource will not rebuild this graph. Read it in the creator and close over the result in Fn.',
    },
    docs: {
      url: gitHubUrl('no-deferred-resource-read'),
      recommended: true,
      description:
        'Disallow reading shared TSL resources inside Fn() in a useLocalNodes creator, where the read is not tracked.',
    },
    schema: [],
  },
  create(ctx) {
    return {
      CallExpression(node: ESTree.CallExpression) {
        const found = creatorOf(ctx, node, USE_LOCAL_NODES)
        if (!found) return
        const { creator } = found

        for (const binding of stateBindings(ctx, creator, RESOURCE_KEYS)) {
          for (const reference of binding.variable.references) {
            const read = keyRead(binding, reference)
            if (!read) continue
            // Any function between the read and the creator that is an Fn body defers the read
            for (const ancestor of ancestors(read)) {
              if (ancestor === creator) break
              if (isFunction(ancestor) && isFnBody(ancestor)) {
                ctx.report({ node: read, messageId: 'deferredRead', data: { key: binding.key } })
                break
              }
            }
          }
        }
      },
    }
  },
}

export default rule
