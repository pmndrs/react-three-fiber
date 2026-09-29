import type { Rule } from 'eslint'
import * as ESTree from 'estree'
import { gitHubUrl } from '../lib/url'

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      preferUseLoader:
        'Prefer useLoader over Loader.load()/Loader.loadAsync() in effects. useLoader integrates with Suspense, caches resources, and de-duplicates them on both CPU and GPU.',
    },
    docs: {
      url: gitHubUrl('prefer-useloader'),
      recommended: true,
      description: 'Prefer useLoader for loading assets rather than calling load/loadAsync in effects.',
    },
  },
  create(ctx) {
    return {
      'CallExpression[callee.name=useEffect] CallExpression'(node: ESTree.CallExpression) {
        const { callee } = node
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          (callee.property.name === 'load' || callee.property.name === 'loadAsync')
        ) {
          ctx.report({ messageId: 'preferUseLoader', node })
        }
      },
    }
  },
}

export default rule
