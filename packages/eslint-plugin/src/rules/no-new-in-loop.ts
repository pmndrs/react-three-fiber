import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { calleeName, parentOf } from '../lib/ast'
import { frameLoopListener } from '../lib/frame'
import { gitHubUrl } from '../lib/url'

/**
 * Errors are only constructed on the failure path, which does not run every frame: `throw new X()`
 * and `new SomethingError()` are not per-frame allocations.
 */
function isErrorPath(node: ESTree.NewExpression): boolean {
  return parentOf(node)?.type === 'ThrowStatement' || /Error$/.test(calleeName(node.callee as ESTree.Node) ?? '')
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: {
      noNew:
        'Instantiating new objects in the frame loop can cause performance problems. Instead, create once in a useMemo or a single, shared reference outside of the component.',
    },
    docs: {
      url: gitHubUrl('no-new-in-loop'),
      recommended: true,
      description: 'Disallow instantiating new objects in the frame loop which can cause performance problems.',
    },
    schema: [],
  },
  create(ctx) {
    return frameLoopListener(ctx, {
      NewExpression({ node }: { node: ESTree.NewExpression }) {
        if (isErrorPath(node)) return
        ctx.report({ messageId: 'noNew', node })
      },
    })
  },
}

export default rule
