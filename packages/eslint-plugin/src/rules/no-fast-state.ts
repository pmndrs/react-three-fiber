import type { Rule } from 'eslint'
import * as ESTree from 'estree'
import { gitHubUrl } from '../lib/url'

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noFastState:
        'Calling a state setter inside useFrame causes a full React re-render every frame (60fps = 60 re-renders/second). Use useRef for values that change every frame and mutate the ref directly.',
    },
    docs: {
      url: gitHubUrl('no-fast-state'),
      recommended: true,
      description: 'Disallow calling React state setters inside useFrame which causes re-renders every frame.',
    },
  },
  create(ctx) {
    const stateSetters = new Set<string>()
    let useFrameDepth = 0

    return {
      // Track useState destructuring: const [foo, setFoo] = useState(...)
      VariableDeclarator(node: ESTree.VariableDeclarator) {
        if (
          node.init &&
          node.init.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          (node.init.callee.name === 'useState' || node.init.callee.name === 'useReducer') &&
          node.id.type === 'ArrayPattern' &&
          node.id.elements.length >= 2
        ) {
          const setter = node.id.elements[1]
          if (setter && setter.type === 'Identifier') {
            stateSetters.add(setter.name)
          }
        }
      },

      // Track entering a useFrame callback
      ['CallExpression[callee.name=useFrame]'](node: ESTree.CallExpression) {
        useFrameDepth++
      },
      ['CallExpression[callee.name=useFrame]:exit']() {
        useFrameDepth--
      },

      // Flag calls to known setters inside useFrame
      CallExpression(node: ESTree.CallExpression) {
        if (useFrameDepth > 0 && node.callee.type === 'Identifier' && stateSetters.has(node.callee.name)) {
          ctx.report({
            messageId: 'noFastState',
            node: node,
          })
        }
      },
    }
  },
}

export default rule
