import type { Rule } from 'eslint'
import { attributes, elementName, isIntrinsic, onOpeningElement } from '../lib/jsx'
import { gitHubUrl } from '../lib/url'

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: {
      onUpdate:
        '`onUpdate` was removed in v10 and is now assigned to the object like any other prop: it no longer runs after prop ' +
        "updates (on <texture> it sets three's Texture.onUpdate, fired after a GPU upload). Use an effect keyed on the " +
        'props that change, read the object in useFrame, or use a ref callback.',
    },
    docs: {
      url: gitHubUrl('no-onupdate-prop'),
      recommended: false,
      migration: true,
      description: 'Disallow the removed `onUpdate` prop on three.js elements.',
    } as Rule.RuleMetaData['docs'],
    schema: [],
  },
  create(ctx) {
    return {
      JSXOpeningElement: onOpeningElement((element) => {
        if (!isIntrinsic(elementName(element))) return
        const attribute = attributes(element).get('onUpdate')
        if (attribute) ctx.report({ node: attribute as never, messageId: 'onUpdate' })
      }),
    }
  },
}

export default rule
