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
      // Match a `.clone()` *call* — the identifier must be the property of the callee. A bare
      // descendant match on `Identifier[name=clone]` also flagged a loop variable named `clone`
      // used as `clone.position`, with no clone() invocation anywhere.
      ['CallExpression[callee.name=useFrame] CallExpression[callee.type=MemberExpression][callee.property.name=clone]'](
        node: ESTree.CallExpression,
      ) {
        ctx.report({
          messageId: 'noClone',
          node: (node.callee as ESTree.MemberExpression).property,
        })
      },
    }
  },
}

export default rule
