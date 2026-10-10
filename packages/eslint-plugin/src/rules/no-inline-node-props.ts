import type { Rule } from 'eslint'
import { calleeName } from '../lib/ast'
import { attributeName, attributeValue, elementName, isIntrinsic, onOpeningElement } from '../lib/jsx'
import { gitHubUrl } from '../lib/url'

const MATERIAL = /Material$/
const NODE_PROP = /.Node$/

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: {
      inlineNode:
        '`{{prop}}` builds a new node on every render. R3F marks the material for recompilation whenever a *Node prop changes, ' +
        'so this recompiles the shader each render. Build the node once with useLocalNodes(..., []) (or useMemo) and pass that.',
    },
    docs: {
      url: gitHubUrl('no-inline-node-props'),
      recommended: true,
      description: 'Disallow building TSL nodes inline in material props, which recompiles the shader every render.',
    },
    schema: [],
  },
  create(ctx) {
    return {
      JSXOpeningElement: onOpeningElement((element) => {
        const name = elementName(element)
        if (!isIntrinsic(name) || !MATERIAL.test(name)) return
        for (const attribute of element.attributes) {
          if (attribute.type !== 'JSXAttribute') continue
          const prop = attributeName(attribute)
          if (!prop || !NODE_PROP.test(prop)) continue
          const value = attributeValue(attribute)
          if (value.kind !== 'expression') continue
          const { node } = value
          const builds =
            node.type === 'NewExpression' || (node.type === 'CallExpression' && calleeName(node.callee) !== 'fromRef')
          if (builds) ctx.report({ node, messageId: 'inlineNode', data: { prop } })
        }
      }),
    }
  },
}

export default rule
