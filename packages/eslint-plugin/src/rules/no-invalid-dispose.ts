import type { Rule } from 'eslint'
import { attributes, attributeValue, elementName, isIntrinsic, onOpeningElement } from '../lib/jsx'
import { gitHubUrl } from '../lib/url'

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    messages: {
      onlyNull:
        '`dispose={{{value}}}` does nothing: R3F only skips disposal for `dispose={null}`, and disposes everything else on unmount.',
    },
    docs: {
      url: gitHubUrl('no-invalid-dispose'),
      recommended: true,
      description: 'Require `dispose={null}` to opt out of disposal; `false` and other values are ignored.',
    },
    schema: [],
  },
  create(ctx) {
    return {
      JSXOpeningElement: onOpeningElement((element) => {
        if (!isIntrinsic(elementName(element))) return
        const attribute = attributes(element).get('dispose')
        if (!attribute) return
        const value = attributeValue(attribute)
        if (value.kind === 'shorthand') {
          ctx.report({ node: attribute as never, messageId: 'onlyNull', data: { value: 'true' } })
          return
        }
        if (value.kind !== 'literal' || value.value === null) return
        ctx.report({
          node: attribute as never,
          messageId: 'onlyNull',
          data: { value: JSON.stringify(value.value) },
          // `false` reads as "don't dispose", which is what null means
          fix: value.value === false ? (fixer) => fixer.replaceText(attribute as never, 'dispose={null}') : null,
        })
      }),
    }
  },
}

export default rule
