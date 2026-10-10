import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { frameLoopListener } from '../lib/frame'
import { gitHubUrl } from '../lib/url'

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: {
      noClone:
        'Cloning vectors in the frame loop can cause performance problems. Instead, create once in a useMemo or a single, shared reference outside of the component.',
    },
    docs: {
      url: gitHubUrl('no-clone-in-loop'),
      recommended: true,
      description: 'Disallow cloning vectors in the frame loop which can cause performance problems.',
    },
    schema: [],
  },
  create(ctx) {
    return frameLoopListener(ctx, {
      // Match a `.clone()` *call* — the identifier must be the property of the callee. A bare
      // descendant match on `Identifier[name=clone]` also flagged a loop variable named `clone`
      // used as `clone.position`, with no clone() invocation anywhere.
      'CallExpression[callee.type=MemberExpression][callee.property.name=clone]'({
        node,
      }: {
        node: ESTree.CallExpression
      }) {
        ctx.report({ messageId: 'noClone', node: (node.callee as ESTree.MemberExpression).property })
      },
    })
  },
}

export default rule
