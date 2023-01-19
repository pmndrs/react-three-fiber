import type { Rule } from 'eslint'
import * as ESTree from 'estree'
import { gitHubUrl } from 'packages/eslint-plugin/lib/url'

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noClone:
        'Cloning vectors in the frame loop can cause performance problems. Instead, copy using one from the parent scope.',
    },
    docs: {
      url: gitHubUrl('no-clone-in-loop'),
      recommended: true,
      description:
        'Disallow cloning vectors in the frame loop which can cause the garbage collector to do more work than necessary.',
    },
  },
  create(ctx) {
    return {
      ['CallExpression[callee.name=useFrame] CallExpression MemberExpression Identifier[name=clone]'](
        node: ESTree.NewExpression,
      ) {
        ctx.report({
          messageId: 'noClone',
          node: node,
        })
      },
    }
  },
}

export default rule
