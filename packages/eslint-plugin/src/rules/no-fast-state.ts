import type { Rule, Scope } from 'eslint'
import type * as ESTree from 'estree'
import { calleeName, type FunctionNode, isCallTo, resolve, soleDefinition } from '../lib/ast'
import { frameLoopListener, type FrameMatch } from '../lib/frame'
import { gitHubUrl } from '../lib/url'

const STATE_HOOKS = new Set(['useState', 'useReducer'])
const USE_THREE = new Set(['useThree'])
/** RootState setters that write to the store and re-render its subscribers. */
const STORE_SETTERS = new Set(['set', 'setSize', 'setDpr', 'setEvents', 'setFrameloop'])
const SETTER_NAME = /^set[A-Z]/

interface Options {
  allowGuarded: boolean
}

/** `const [value, setValue] = useState()` / `const [state, dispatch] = useReducer()` */
function isStateHookSetter(def: Scope.Definition, name: string): boolean {
  if (def.type !== 'Variable' || def.node.id.type !== 'ArrayPattern') return false
  const setter = def.node.id.elements[1]
  return setter?.type === 'Identifier' && setter.name === name && isCallTo(def.node.init, STATE_HOOKS)
}

/**
 * A `setX` prop: `function C({ setX })`, `function C(props) { const { setX } = props }`. The frame
 * callback's own parameters are frame state, not props, and are matched precisely elsewhere.
 */
function isSetterProp(ctx: Rule.RuleContext, def: Scope.Definition, name: string, callback: FunctionNode): boolean {
  if (!SETTER_NAME.test(name)) return false
  if (def.type === 'Parameter') return def.node !== callback
  if (def.type !== 'Variable' || def.node.id.type !== 'ObjectPattern') return false
  const init = def.node.init
  if (init?.type !== 'Identifier') return false
  return soleDefinition(resolve(ctx, init))?.type === 'Parameter'
}

/** The property an object pattern binds to `name`: `{ set }`, `{ set: write }` */
function destructuredKey(pattern: ESTree.ObjectPattern, name: string): string | undefined {
  for (const property of pattern.properties) {
    if (property.type !== 'Property' || property.key.type !== 'Identifier') continue
    if (property.value.type === 'Identifier' && property.value.name === name) return property.key.name
  }
  return undefined
}

/** `const set = useThree((s) => s.set)` / `const { set } = useThree()` */
function isUseThreeSetter(def: Scope.Definition, name: string): boolean {
  if (def.type !== 'Variable' || !isCallTo(def.node.init, USE_THREE)) return false
  const id = def.node.id
  const init = def.node.init as ESTree.CallExpression
  if (id.type === 'ObjectPattern') return STORE_SETTERS.has(destructuredKey(id, name) ?? '')
  const selector = init.arguments[0]
  if (id.type !== 'Identifier' || selector?.type !== 'ArrowFunctionExpression') return false
  return selector.body.type === 'MemberExpression' && STORE_SETTERS.has(calleeName(selector.body) ?? '')
}

/** `useFrame(({ set }) => set(...))` */
function isFrameStateSetter(def: Scope.Definition, name: string, callback: FunctionNode): boolean {
  if (def.type !== 'Parameter' || def.node !== callback) return false
  const state = callback.params[0]
  return state?.type === 'ObjectPattern' && STORE_SETTERS.has(destructuredKey(state, name) ?? '')
}

function isReactSetter(ctx: Rule.RuleContext, call: ESTree.CallExpression, callback: FunctionNode): boolean {
  const { callee } = call

  // useFrame((state) => state.set(...)), useFrame((state) => state.setDpr(...))
  if (callee.type === 'MemberExpression') {
    if (!STORE_SETTERS.has(calleeName(callee) ?? '') || callee.object.type !== 'Identifier') return false
    const def = soleDefinition(resolve(ctx, callee.object))
    const state = callback.params[0]
    return (
      def?.type === 'Parameter' &&
      def.node === callback &&
      state?.type === 'Identifier' &&
      state.name === callee.object.name
    )
  }

  if (callee.type !== 'Identifier') return false
  const def = soleDefinition(resolve(ctx, callee))
  if (!def) return false
  return (
    isStateHookSetter(def, callee.name) ||
    isUseThreeSetter(def, callee.name) ||
    isFrameStateSetter(def, callee.name, callback) ||
    isSetterProp(ctx, def, callee.name, callback)
  )
}

/** `if (!cond) return` (or `{ return }`) */
function isEarlyReturn(statement: ESTree.Statement): boolean {
  if (statement.type !== 'IfStatement') return false
  const exits = (node: ESTree.Statement | null | undefined): boolean =>
    !!node &&
    (node.type === 'ReturnStatement' ||
      (node.type === 'BlockStatement' && node.body.some((child) => child.type === 'ReturnStatement')))
  return exits(statement.consequent) || exits(statement.alternate)
}

/**
 * Whether the call only runs behind a condition: an `if`/`switch` branch, a ternary branch, the
 * right side of `&&`/`||`/`??`, or after an early `if (...) return`, at any depth inside the frame
 * callback. The condition itself is not inspected: per the RFC, a guard is taken as the author's
 * intent to set state only when something changes.
 */
function isGuarded(call: ESTree.CallExpression, path: ESTree.Node[]): boolean {
  let child: ESTree.Node = call
  for (const ancestor of path) {
    switch (ancestor.type) {
      case 'IfStatement':
        if (child !== ancestor.test) return true
        break
      case 'ConditionalExpression':
        if (child !== ancestor.test) return true
        break
      case 'LogicalExpression':
        if (child === ancestor.right) return true
        break
      case 'SwitchCase':
        return true
      case 'BlockStatement': {
        const index = ancestor.body.indexOf(child as ESTree.Statement)
        if (ancestor.body.slice(0, index).some(isEarlyReturn)) return true
        break
      }
    }
    child = ancestor
  }
  return false
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: {
      noFastState:
        'Setting React state in the frame loop re-renders the component every frame. Mutate a ref (or the object itself) instead, ' +
        'or only set state when the value actually changes behind a condition.',
    },
    docs: {
      url: gitHubUrl('no-fast-state'),
      recommended: true,
      description: 'Disallow setting React state in the frame loop, which re-renders the component every frame.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowGuarded: {
            type: 'boolean',
            description: 'Allow state updates behind a condition, such as `if (changed) setValue(next)`.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowGuarded: true }],
  },
  create(ctx) {
    const { allowGuarded = true } = (ctx.options[0] ?? {}) as Partial<Options>

    return frameLoopListener(ctx, {
      CallExpression({ node, callback, path }: FrameMatch<ESTree.CallExpression>) {
        if (!isReactSetter(ctx, node, callback)) return
        if (allowGuarded && isGuarded(node, path)) return
        ctx.report({ messageId: 'noFastState', node })
      },
    })
  },
}

export default rule
