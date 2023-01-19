import type { Rule } from 'eslint'
import * as ESTree from 'estree'
import { gitHubUrl } from 'packages/eslint-plugin/lib/url'

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noNew:
        'Instantiating new objects in the frame loop can cause performance problems. Instead, create once in a useMemo or a single, shared reference outside of the component.',
    },
    docs: {
      url: gitHubUrl('no-new-in-loop'),
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
