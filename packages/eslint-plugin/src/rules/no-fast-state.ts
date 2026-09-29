import type { Rule } from 'eslint'
import * as ESTree from 'estree'
import { gitHubUrl } from '../lib/url'

const EXCLUDED = new Set(['setTimeout', 'setInterval', 'setImmediate'])

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noFastState:
        'Setting React state inside useFrame causes a re-render every frame and degrades performance. Use refs to mutate values directly, or wrap with startTransition if a state update is necessary.',
    },
    docs: {
      url: gitHubUrl('no-fast-state'),
      recommended: true,
      description: 'Disallow setting React state inside useFrame which causes expensive re-renders every frame.',
    },
  },
  create(ctx) {
    return {
      'CallExpression[callee.name=useFrame] CallExpression'(node: ESTree.CallExpression) {
        const { callee } = node
        if (callee.type === 'Identifier' && /^set[A-Z]/.test(callee.name) && !EXCLUDED.has(callee.name)) {
          ctx.report({ messageId: 'noFastState', node })
        } else if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'setState'
        ) {
          ctx.report({ messageId: 'noFastState', node })
        }
      },
    }
  },
}

export default rule
