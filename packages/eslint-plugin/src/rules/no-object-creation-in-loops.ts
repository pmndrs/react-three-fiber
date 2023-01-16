import type { Rule, AST } from 'eslint'
import * as ESTree from 'estree'

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noNew:
        'Creating new objects in the frame loop can cause performance problems, instead create in the parent scope.',
    },
    docs: {
      recommended: true,
      description: 'Disallow creating objects in loops causing the garbage collector to do more work than necessary.',
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
