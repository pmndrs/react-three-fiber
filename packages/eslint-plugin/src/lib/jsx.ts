import type * as ESTree from 'estree'

/*
 * Minimal JSX node shapes. `estree` has no JSX types and the plugin does not depend on a JSX AST
 * package, so these cover only what the rules read.
 */

export interface JSXIdentifier {
  type: 'JSXIdentifier'
  name: string
}

export interface JSXExpressionContainer {
  type: 'JSXExpressionContainer'
  expression: ESTree.Expression | { type: 'JSXEmptyExpression' }
}

export interface JSXAttribute {
  type: 'JSXAttribute'
  name: JSXIdentifier | { type: 'JSXNamespacedName' }
  value: ESTree.Literal | JSXExpressionContainer | null
  range?: [number, number]
}

export interface JSXOpeningElement {
  type: 'JSXOpeningElement'
  name: JSXIdentifier | { type: 'JSXMemberExpression' | 'JSXNamespacedName' }
  attributes: (JSXAttribute | { type: 'JSXSpreadAttribute' })[]
  range?: [number, number]
}

/** The element's name for plain identifiers (`mesh`, `Canvas`), not `a.b` or `a:b`. */
export function elementName(element: JSXOpeningElement): string | undefined {
  return element.name.type === 'JSXIdentifier' ? element.name.name : undefined
}

/** A lowercase element: a three.js object for R3F, or a DOM element. */
export function isIntrinsic(name: string | undefined): name is string {
  return name !== undefined && /^[a-z]/.test(name)
}

export function attributeName(attribute: JSXAttribute): string | undefined {
  return attribute.name.type === 'JSXIdentifier' ? attribute.name.name : undefined
}

/** The element's named attributes; spread attributes are skipped. */
export function attributes(element: JSXOpeningElement): Map<string, JSXAttribute> {
  const map = new Map<string, JSXAttribute>()
  for (const attribute of element.attributes) {
    if (attribute.type !== 'JSXAttribute') continue
    const name = attributeName(attribute)
    if (name !== undefined) map.set(name, attribute)
  }
  return map
}

/** Whether the element spreads props, so any attribute may be set without being written out. */
export function hasSpread(element: JSXOpeningElement): boolean {
  return element.attributes.some((attribute) => attribute.type === 'JSXSpreadAttribute')
}

export type AttributeValue =
  | { kind: 'shorthand' }
  | { kind: 'literal'; value: ESTree.Literal['value']; node: ESTree.Literal }
  | { kind: 'expression'; node: ESTree.Expression }
  | { kind: 'empty' }

/**
 * What an attribute was given: `<x a />` (shorthand `true`), `a="s"`, `a={expr}`. A string or
 * number inside braces counts as a literal too.
 */
export function attributeValue(attribute: JSXAttribute): AttributeValue {
  const { value } = attribute
  if (value === null) return { kind: 'shorthand' }
  if (value.type === 'Literal') return { kind: 'literal', value: value.value, node: value }
  const expression = value.expression
  if (expression.type === 'JSXEmptyExpression') return { kind: 'empty' }
  if (expression.type === 'Literal') return { kind: 'literal', value: expression.value, node: expression }
  return { kind: 'expression', node: expression }
}

/**
 * Whether an attribute is given at all: `a={undefined}` (and `a={false}` for props whose falsy
 * value means "not set") count as absent.
 */
export function isSet(attribute: JSXAttribute | undefined, { falseIsUnset = false } = {}): boolean {
  if (!attribute) return false
  const value = attributeValue(attribute)
  if (value.kind === 'empty') return false
  if (value.kind === 'expression') return !(value.node.type === 'Identifier' && value.node.name === 'undefined')
  if (value.kind === 'literal') return !(value.value === null || (falseIsUnset && value.value === false))
  return true
}

/**
 * HTML and SVG tag names. R3F elements are lowercase too, so this is how a rule tells a DOM element
 * from a three.js one. `line` is in both; R3F's meaning wins, since an SVG `<line>` rarely carries
 * pointer handlers.
 */
export const DOM_ELEMENTS = new Set(
  (
    'a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col ' +
    'colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 ' +
    'h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label legend li link main map mark menu meta ' +
    'meter nav noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp script search ' +
    'section select slot small source span strong style sub summary sup table tbody td template textarea tfoot th ' +
    'thead time title tr track u ul var video wbr ' +
    'svg animate animateMotion animateTransform circle clipPath defs desc ellipse feBlend feColorMatrix ' +
    'feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight ' +
    'feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology ' +
    'feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter foreignObject g image ' +
    'linearGradient marker mask metadata mpath path pattern polygon polyline radialGradient rect set stop switch ' +
    'symbol text textPath tspan use view'
  ).split(' '),
)

/**
 * A `JSXOpeningElement` listener. ESLint types listeners with `estree` nodes, which have no JSX, so
 * the element is handed over with this file's shape.
 */
export function onOpeningElement(handler: (element: JSXOpeningElement) => void): (node: ESTree.Node) => void {
  return (node) => handler(node as unknown as JSXOpeningElement)
}
