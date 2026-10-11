import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { mergeListeners, parentOf } from '../lib/ast'
import { trackFiberImports } from '../lib/imports'
import { attributes, attributeValue, elementName, type JSXOpeningElement, onOpeningElement } from '../lib/jsx'
import { gitHubUrl } from '../lib/url'

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    messages: {
      background:
        '`<color attach="background">` directly in a Canvas is deprecated. Set the background on the Canvas instead: ' +
        '`<Canvas background="#1a1a2e">`, which also accepts environment presets and HDR files.',
    },
    docs: {
      url: gitHubUrl('prefer-canvas-background'),
      recommended: false,
      migration: true,
      description: 'Prefer the Canvas `background` prop over `<color attach="background">` in a Canvas.',
    } as Rule.RuleMetaData['docs'],
    schema: [],
  },
  create(ctx) {
    const imports = trackFiberImports()

    /** Whether `element` is a direct child of an R3F `<Canvas>`, so it sets the root scene's background. */
    const inCanvas = (element: JSXOpeningElement) => {
      const parent = parentOf(parentOf(element as unknown as ESTree.Node)!) as unknown as
        | { type: string; openingElement?: JSXOpeningElement }
        | undefined
      if (parent?.type !== 'JSXElement' || !parent.openingElement) return false
      const name = elementName(parent.openingElement)
      return name !== undefined && imports.get(name)?.imported === 'Canvas'
    }

    return mergeListeners(imports.listener, {
      JSXOpeningElement: onOpeningElement((element) => {
        if (elementName(element) !== 'color' || !inCanvas(element)) return
        const attach = attributes(element).get('attach')
        const value = attach && attributeValue(attach)
        if (value?.kind === 'literal' && value.value === 'background') {
          ctx.report({ node: element as never, messageId: 'background' })
        }
      }),
    })
  },
}

export default rule
