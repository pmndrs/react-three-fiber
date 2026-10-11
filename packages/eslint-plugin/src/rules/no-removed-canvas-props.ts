import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { mergeListeners } from '../lib/ast'
import { type FiberEntry, trackFiberImports } from '../lib/imports'
import {
  attributes,
  attributeValue,
  type JSXAttribute,
  type JSXOpeningElement,
  elementName,
  onOpeningElement,
} from '../lib/jsx'
import { gitHubUrl } from '../lib/url'

/** Props v10 dropped from Canvas without a throw: they fall through to the wrapper <div>. */
const IGNORED: Record<string, string> = {
  legacy: 'ColorManagement is always enabled now; remove it',
  linear: 'use `{{bag}}={{ outputColorSpace: THREE.LinearSRGBColorSpace }}`',
  flat: 'use `{{bag}}={{ toneMapping: THREE.NoToneMapping }}`',
  colorSpace: 'use `{{bag}}={{ outputColorSpace: ... }}`',
  toneMapping: 'use `{{bag}}={{ toneMapping: ... }}`',
}
/** Props that moved into the renderer settings bag, value unchanged. */
const MOVED_TO_BAG = new Set(['shadows', 'textureColorSpace'])
/** Settings bag keys that moved out to Canvas props, and throw. */
const MOVED_OUT: Record<string, string> = {
  primaryCanvas: 'mark the owner `<Canvas primary>`; other canvases share it automatically (or use share="id")',
  scheduler: 'use `<Canvas scheduler>`',
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    messages: {
      movedToBag: '`{{prop}}` moved into the renderer settings in v10: use `{{bag}}={{ {{prop}}: ... }}`.{{throws}}',
      ignored: 'The `{{prop}}` Canvas prop was removed in v10 and is ignored: {{hint}}.',
      movedOut: '`{{bag}}={{ {{key}} }}` was removed in v10 and throws: {{hint}}.',
      rendererBoolean:
        '`<Canvas renderer>` is the default in v10: a Canvas from {{entry}} always renders with WebGPU. Remove it.',
    },
    docs: {
      url: gitHubUrl('no-removed-canvas-props'),
      recommended: false,
      migration: true,
      description: 'Replace Canvas props that v10 removed or moved into the renderer settings.',
    } as Rule.RuleMetaData['docs'],
    schema: [],
  },
  create(ctx) {
    const imports = trackFiberImports()
    const text = (node: unknown) => ctx.sourceCode.getText(node as ESTree.Node)

    /** `<Canvas a />` → `true`, `a="x"` → `"x"`, `a={expr}` → `expr` */
    const valueText = (attribute: JSXAttribute): string | undefined => {
      const value = attributeValue(attribute)
      if (value.kind === 'shorthand') return 'true'
      if (value.kind === 'empty') return undefined
      return text(value.node)
    }

    /** Removes an attribute and the whitespace before it. */
    const removeAttribute = (fixer: Rule.RuleFixer, attribute: JSXAttribute) => {
      const before = ctx.sourceCode.getTokenBefore(attribute as never)!
      return fixer.removeRange([before.range![1], attribute.range![1]])
    }

    /** Moves `prop={value}` into the settings bag: a new bag, or an object literal one. */
    const moveToBag = (
      element: JSXOpeningElement,
      attribute: JSXAttribute,
      prop: string,
      bagName: string,
    ): Rule.ReportFixer | null => {
      const value = valueText(attribute)
      if (value === undefined) return null
      const bag = attributes(element).get(bagName)
      if (!bag) return (fixer) => fixer.replaceText(attribute as never, `${bagName}={{ ${prop}: ${value} }}`)
      const bagValue = attributeValue(bag)
      if (bagValue.kind === 'shorthand') {
        return (fixer) => [
          fixer.replaceText(bag as never, `${bagName}={{ ${prop}: ${value} }}`),
          removeAttribute(fixer, attribute),
        ]
      }
      if (bagValue.kind !== 'expression' || bagValue.node.type !== 'ObjectExpression') return null
      const object = bagValue.node
      const opening = ctx.sourceCode.getFirstToken(object)!
      const insert = object.properties.length ? ` ${prop}: ${value},` : ` ${prop}: ${value} `
      return (fixer) => [fixer.insertTextAfter(opening, insert), removeAttribute(fixer, attribute)]
    }

    const check = (element: JSXOpeningElement, entry: FiberEntry) => {
      const bagName = entry === 'legacy' ? 'gl' : 'renderer'
      const attrs = attributes(element)

      for (const [prop, attribute] of attrs) {
        if (MOVED_TO_BAG.has(prop)) {
          ctx.report({
            node: attribute as never,
            messageId: 'movedToBag',
            data: { prop, bag: bagName, throws: prop === 'shadows' ? ' The old prop throws.' : '' },
            fix: moveToBag(element, attribute, prop, bagName),
          })
        } else if (prop in IGNORED) {
          ctx.report({
            node: attribute as never,
            messageId: 'ignored',
            data: { prop, hint: IGNORED[prop].replace('{{bag}}', bagName) },
          })
        }
      }

      for (const bag of ['gl', 'renderer']) {
        const attribute = attrs.get(bag)
        const value = attribute && attributeValue(attribute)
        if (value?.kind !== 'expression' || value.node.type !== 'ObjectExpression') continue
        for (const property of value.node.properties) {
          if (property.type !== 'Property' || property.key.type !== 'Identifier') continue
          const key = property.key.name
          if (key in MOVED_OUT) {
            ctx.report({ node: property, messageId: 'movedOut', data: { bag, key, hint: MOVED_OUT[key] } })
          }
        }
      }

      const renderer = attrs.get('renderer')
      const rendererValue = renderer && attributeValue(renderer)
      const isTrue =
        rendererValue?.kind === 'shorthand' || (rendererValue?.kind === 'literal' && rendererValue.value === true)
      // A moved prop folds into `renderer={{ ... }}` instead, replacing the boolean
      const folding = [...attrs.keys()].some((prop) => MOVED_TO_BAG.has(prop))
      if (renderer && isTrue && entry !== 'legacy' && !folding) {
        ctx.report({
          node: renderer as never,
          messageId: 'rendererBoolean',
          data: { entry: entry === 'webgpu' ? '@react-three/fiber/webgpu' : '@react-three/fiber' },
          fix: (fixer) => removeAttribute(fixer, renderer),
        })
      }
    }

    return mergeListeners(imports.listener, {
      JSXOpeningElement: onOpeningElement((element) => {
        const name = elementName(element)
        const imported = name ? imports.get(name) : undefined
        if (imported?.imported !== 'Canvas') return
        if (imported.entry === 'default' || imported.entry === 'legacy' || imported.entry === 'webgpu') {
          check(element, imported.entry)
        }
      }),
    })
  },
}

export default rule
