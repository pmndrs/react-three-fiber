import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { calleeName, isFunction } from '../lib/ast'
import { attributes, attributeValue, elementName, isIntrinsic, onOpeningElement } from '../lib/jsx'
import { gitHubUrl } from '../lib/url'

/**
 * A value that is a new object on every render: R3F compares `args` element by element with `!==`
 * and `<primitive object>` by reference, so any of these rebuilds the three.js object each time.
 */
function unstableKind(node: ESTree.Node): string | undefined {
  if (node.type === 'NewExpression') return `new ${calleeName(node.callee as ESTree.Node) ?? 'object'}()`
  if (node.type === 'ArrayExpression') return 'an array literal'
  if (node.type === 'ObjectExpression') return 'an object literal'
  if (isFunction(node)) return 'an inline function'
  if (node.type === 'CallExpression' && calleeName(node.callee) === 'clone') return 'a .clone() call'
  return undefined
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: {
      unstableArg:
        '{{kind}} in `args` is a new value on every render, so R3F rebuilds the object (and disposes the old one) each time. ' +
        'Create it once with useMemo, or outside the component.',
      unstableObject:
        '{{kind}} in `<primitive object>` is a new object on every render, so R3F swaps the primitive each time. ' +
        'Create it once with useMemo, or outside the component.',
    },
    docs: {
      url: gitHubUrl('no-unstable-args'),
      recommended: true,
      description:
        'Disallow new objects in `args` and `<primitive object>`, which rebuild the three.js object every render.',
    },
    schema: [],
  },
  create(ctx) {
    return {
      JSXOpeningElement: onOpeningElement((element) => {
        const name = elementName(element)
        if (!isIntrinsic(name)) return
        const attrs = attributes(element)

        const args = attrs.get('args')
        const argsValue = args && attributeValue(args)
        if (argsValue?.kind === 'expression' && argsValue.node.type === 'ArrayExpression') {
          for (const item of argsValue.node.elements) {
            if (!item || item.type === 'SpreadElement') continue
            const kind = unstableKind(item)
            if (kind) ctx.report({ node: item, messageId: 'unstableArg', data: { kind } })
          }
        }

        const object = name === 'primitive' ? attrs.get('object') : undefined
        const objectValue = object && attributeValue(object)
        if (objectValue?.kind === 'expression') {
          const kind = unstableKind(objectValue.node)
          if (kind) ctx.report({ node: objectValue.node, messageId: 'unstableObject', data: { kind } })
        }
      }),
    }
  },
}

export default rule
