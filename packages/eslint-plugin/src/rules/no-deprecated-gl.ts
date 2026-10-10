import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { stateAccessListener } from '../lib/state'
import { gitHubUrl } from '../lib/url'

const KEYS = new Set(['gl'])

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    messages: {
      deprecatedGl:
        '`gl` is deprecated: read `renderer` instead. On a WebGPU canvas `gl` is the WebGPURenderer and logs a deprecation ' +
        'notice; `renderer` is the same object on every entry.',
    },
    docs: {
      url: gitHubUrl('no-deprecated-gl'),
      recommended: false,
      migration: true,
      description: 'Replace `state.gl` with `state.renderer`.',
    } as Rule.RuleMetaData['docs'],
    schema: [],
  },
  create(ctx) {
    return stateAccessListener(ctx, KEYS, (access) => {
      if (access.kind === 'member') {
        const property = access.node.property as ESTree.Identifier
        ctx.report({
          node: property,
          messageId: 'deprecatedGl',
          fix: (fixer) => fixer.replaceText(property, 'renderer'),
        })
        return
      }
      const { node } = access
      ctx.report({
        node,
        messageId: 'deprecatedGl',
        // `{ gl }` binds `gl`, so keep the local name: `{ renderer: gl }`
        fix: (fixer) =>
          node.shorthand && node.value.type === 'Identifier'
            ? fixer.replaceText(node, `renderer: ${ctx.sourceCode.getText(node.value)}`)
            : node.shorthand
              ? null
              : fixer.replaceText(node.key, 'renderer'),
      })
    })
  },
}

export default rule
