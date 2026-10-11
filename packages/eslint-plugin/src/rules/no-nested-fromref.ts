import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { calleeName, parentOf } from '../lib/ast'
import { gitHubUrl } from '../lib/url'

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: {
      nested:
        'fromRef() is only resolved as the whole value of a prop on a three.js element. Inside an array or object it is never ' +
        'resolved, and the object receives the marker itself. Pass it as the prop, and use its transform to wrap the value: ' +
        'fromRef(ref, (object) => [object]).',
    },
    docs: {
      url: gitHubUrl('no-nested-fromref'),
      recommended: true,
      description: 'Disallow fromRef() inside arrays and objects, where it is never resolved.',
    },
    schema: [],
  },
  create(ctx) {
    return {
      CallExpression(node: ESTree.CallExpression) {
        if (calleeName(node.callee) !== 'fromRef') return
        const parent = parentOf(node)
        if (parent?.type === 'ArrayExpression' || (parent?.type === 'Property' && parent.value === node)) {
          ctx.report({ node, messageId: 'nested' })
        }
      },
    }
  },
}

export default rule
