import type { Rule } from 'eslint'
import * as ESTree from 'estree'
import { gitHubUrl } from '../lib/url'

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      preferUseLoader:
        'Prefer useLoader over Loader.load()/loadAsync() inside effects. useLoader integrates with React Suspense and provides automatic caching.',
    },
    docs: {
      url: gitHubUrl('prefer-useloader'),
      recommended: true,
      description:
        'Prefer useLoader over calling Loader.load() or Loader.loadAsync() inside effects for suspense and caching benefits.',
    },
  },
  create(ctx) {
    let insideEffect = false

    return {
      ['CallExpression[callee.name=/^use(Layout)?Effect$/]'](node: ESTree.CallExpression) {
        insideEffect = true
      },
      ['CallExpression[callee.name=/^use(Layout)?Effect$/]:exit']() {
        insideEffect = false
      },
      ['CallExpression[callee.property.name=/^(load|loadAsync)$/]'](node: ESTree.CallExpression) {
        if (insideEffect) {
          ctx.report({
            messageId: 'preferUseLoader',
            node: node,
          })
        }
      },
    }
  },
}

export default rule
