import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { type FunctionNode, isFunction, parentOf } from '../lib/ast'
import { creatorOf, keyRead, stateBindings } from '../lib/tsl'
import { gitHubUrl } from '../lib/url'

/** Creator state keys that hold three.js objects shared with the rest of the scene. */
const THREE_OBJECTS: ReadonlySet<string> = new Set(['scene', 'camera', 'renderer', 'gl'])
/** Hooks whose creator must return what it builds. */
const RETURNING_HOOKS: ReadonlySet<string> = new Set(['useNodes', 'useLocalNodes'])

/** The function a node runs in. */
function enclosingFunction(node: ESTree.Node): ESTree.Node | undefined {
  for (let current = parentOf(node); current; current = parentOf(current)) {
    if (isFunction(current)) return current
  }
  return undefined
}

/** Whether a block-bodied creator returns a value from its own body (not a nested function's). */
function returnsValue(creator: FunctionNode): boolean {
  if (creator.body.type !== 'BlockStatement') return true
  let found = false
  const visit = (node: ESTree.Node) => {
    if (found) return
    if (node.type === 'ReturnStatement') {
      if (node.argument) found = true
      return
    }
    if (isFunction(node)) return
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') continue
      if (Array.isArray(value)) value.forEach((child) => child && typeof child.type === 'string' && visit(child))
      else if (value && typeof value === 'object' && typeof (value as ESTree.Node).type === 'string') {
        visit(value as ESTree.Node)
      }
    }
  }
  creator.body.body.forEach(visit)
  return found
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: {
      mutation:
        '{{hook}} runs its creator during render, which React may discard or repeat, so assigning to `{{key}}` here is unsafe. ' +
        'Use useLocalNodes and return a function that assigns it: that function runs after commit and may return a cleanup.',
      returnsNothing:
        '{{hook}} registers what its creator returns, and this one returns nothing. To put a node onto a three.js object, ' +
        'use useLocalNodes and return a function that assigns it.',
    },
    docs: {
      url: gitHubUrl('no-creator-side-effects'),
      recommended: true,
      description: 'Disallow mutating the scene or camera in a TSL hook creator, which runs during render.',
    },
    schema: [],
  },
  create(ctx) {
    return {
      CallExpression(node: ESTree.CallExpression) {
        const found = creatorOf(ctx, node)
        if (!found) return
        const { hook, creator } = found

        for (const binding of stateBindings(ctx, creator, THREE_OBJECTS)) {
          for (const reference of binding.variable.references) {
            const read = keyRead(binding, reference)
            if (!read) continue
            // `scene.fogNode = x`: an assignment whose target's member chain starts at the binding,
            // made in the creator itself rather than in a function it returns
            let target: ESTree.Node = read
            for (let parent = parentOf(target); parent?.type === 'MemberExpression' && parent.object === target; ) {
              target = parent
              parent = parentOf(target)
            }
            const assignment = parentOf(target)
            if (target === read || assignment?.type !== 'AssignmentExpression' || assignment.left !== target) continue
            if (enclosingFunction(assignment) !== creator) continue
            ctx.report({ node: assignment, messageId: 'mutation', data: { hook, key: binding.key } })
          }
        }

        if (RETURNING_HOOKS.has(hook) && !returnsValue(creator)) {
          ctx.report({ node: node.arguments[0] as ESTree.Node, messageId: 'returnsNothing', data: { hook } })
        }
      },
    }
  },
}

export default rule
