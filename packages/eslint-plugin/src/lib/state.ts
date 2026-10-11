import type { Rule, Scope } from 'eslint'
import type * as ESTree from 'estree'
import { calleeName, type FunctionNode, isFunction, mergeListeners, parentOf } from './ast'
import { frameLoopListener, type FrameMatch } from './frame'
import { keyRead, stateBindings } from './tsl'

/** Where a root state value was read from. */
export type StateSource = 'frame' | 'three'

export type StateAccess =
  /** `({ gl }) =>`, `const { gl } = useThree()` */
  | { kind: 'pattern'; key: string; node: ESTree.Property; source: StateSource }
  /** `state.gl`, `useThree((s) => s.gl)` */
  | { kind: 'member'; key: string; node: ESTree.MemberExpression; source: StateSource }

const USE_THREE = new Set(['useThree'])

function patternAccesses(pattern: ESTree.Node, keys: ReadonlySet<string>, source: StateSource): StateAccess[] {
  if (pattern.type !== 'ObjectPattern') return []
  const accesses: StateAccess[] = []
  for (const property of pattern.properties) {
    if (property.type === 'Property' && property.key.type === 'Identifier' && keys.has(property.key.name)) {
      accesses.push({ kind: 'pattern', key: property.key.name, node: property, source })
    }
  }
  return accesses
}

function memberAccesses(variable: Scope.Variable, keys: ReadonlySet<string>, source: StateSource): StateAccess[] {
  const accesses: StateAccess[] = []
  for (const reference of variable.references) {
    const identifier = reference.identifier as ESTree.Identifier
    const parent = parentOf(identifier)
    if (parent?.type !== 'MemberExpression' || parent.object !== identifier || parent.computed) continue
    const key = calleeName(parent)
    if (key && keys.has(key)) accesses.push({ kind: 'member', key, node: parent, source })
  }
  return accesses
}

/** Reads of `keys` from a function's state parameter: `({ gl })` or `(state) => state.gl`. */
function parameterAccesses(
  ctx: Rule.RuleContext,
  fn: FunctionNode,
  keys: ReadonlySet<string>,
  source: StateSource,
): StateAccess[] {
  const param = fn.params[0]
  if (!param) return []
  if (param.type === 'ObjectPattern') return patternAccesses(param, keys, source)
  if (param.type !== 'Identifier') return []
  const accesses: StateAccess[] = []
  for (const binding of stateBindings(ctx, fn, keys)) {
    for (const reference of binding.variable.references) {
      const read = keyRead(binding, reference)
      if (read?.type === 'MemberExpression' && !read.computed) {
        accesses.push({ kind: 'member', key: binding.key, node: read, source })
      }
    }
  }
  return accesses
}

/**
 * Calls `onAccess` for every read of `keys` from R3F's root state that can be seen statically:
 *
 * - a frame callback's state (`useFrame(({ gl }) => ...)`, `useFrame((state) => state.gl)`)
 * - a `useThree` selector (`useThree((s) => s.gl)`, `useThree(({ gl }) => gl)`)
 * - the whole state from `useThree()` (`const { gl } = useThree()`, `const s = useThree(); s.gl`)
 */
export function stateAccessListener(
  ctx: Rule.RuleContext,
  keys: ReadonlySet<string>,
  onAccess: (access: StateAccess) => void,
): Rule.RuleListener {
  const seen = new Set<ESTree.Node>()
  const report = (accesses: StateAccess[]) => {
    for (const access of accesses) {
      if (seen.has(access.node)) continue
      seen.add(access.node)
      onAccess(access)
    }
  }

  const frame = frameLoopListener(ctx, {
    // Matched on the callback's state parameter, which sits inside the callback
    ':function > ObjectPattern, :function > Identifier'({ node, callback }: FrameMatch<ESTree.Node>) {
      if (callback.params[0] === node) report(parameterAccesses(ctx, callback, keys, 'frame'))
    },
  })

  return mergeListeners(frame, {
    CallExpression(node: ESTree.CallExpression) {
      if (!USE_THREE.has(calleeName(node.callee) ?? '')) return
      const selector = node.arguments[0] as ESTree.Node | undefined
      if (selector) {
        if (isFunction(selector)) report(parameterAccesses(ctx, selector, keys, 'three'))
        return
      }
      const declarator = parentOf(node)
      if (declarator?.type !== 'VariableDeclarator' || declarator.init !== node) return
      if (declarator.id.type === 'ObjectPattern') {
        report(patternAccesses(declarator.id, keys, 'three'))
      } else if (declarator.id.type === 'Identifier') {
        const variable = ctx.sourceCode.getDeclaredVariables(declarator)[0]
        if (variable) report(memberAccesses(variable, keys, 'three'))
      }
    },
  })
}
