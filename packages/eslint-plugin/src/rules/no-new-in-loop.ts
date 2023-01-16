import type { Rule } from 'eslint'
import * as ESTree from 'estree'

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noNew:
        'Instantiating new objects in the frame loop can cause performance problems. Instead, create in the parent scope.',
    },
    docs: {
      recommended: true,
      description:
        'Disallow instantiating new objects in the frame loop which can cause the garbage collector to do more work than necessary.',
    },
  },
  create(ctx) {
    return {
      ['CallExpression[callee.name=useFrame] NewExpression'](node: ESTree.NewExpression) {
        ctx.report({
          messageId: 'noNew',
          node: node,
        })
      },
    }
  },
}

export default rule
