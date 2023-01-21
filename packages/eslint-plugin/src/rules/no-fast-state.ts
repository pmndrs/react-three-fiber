import type { Rule } from 'eslint'
import type { Identifier } from 'estree'
import { gitHubUrl } from '../lib/url'

function isSetState(node: Identifier & Rule.NodeParentExtension, context: Rule.RuleContext) {
  const scope = context.getScope()

  for (const ref of scope.references) {
    if (ref.identifier === node && ref.resolved?.defs[0].node.init.callee.name === 'useState') {
      return true
    }
  }

  return false
}

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noFastEventSet: '',
      noUnconditionalSet: '',
    },
    docs: {
      url: gitHubUrl('no-fast-state'),
      recommended: true,
      description: 'Disallow setting state too quickly which can cause performance problems.',
    },
  },
  create(ctx) {
    return {
      ['CallExpression[callee.name=useFrame] CallExpression > Identifier'](
        node: Identifier & Rule.NodeParentExtension,
      ) {
        if (isSetState(node, ctx)) {
          ctx.report({
            messageId: 'noUnconditionalSet',
            node: node.parent,
          })
        }
      },
    }
  },
}

export default rule
