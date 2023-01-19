import type { Rule } from 'eslint'
import * as ESTree from 'estree'
import { gitHubUrl } from '../lib/url'

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noClone:
        'Cloning vectors in the frame loop can cause performance problems. Instead, create once in a useMemo or a single, shared reference outside of the component.',
    },
    docs: {
      url: gitHubUrl('no-clone-in-loop'),
      recommended: true,
      description: 'Disallow cloning vectors in the frame loop which can cause performance problems.',
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
