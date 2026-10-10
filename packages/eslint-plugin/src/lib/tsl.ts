import type { Rule, Scope } from 'eslint'
import type * as ESTree from 'estree'
import { calleeName, type FunctionNode, resolveFunction } from './ast'

/** Creator state keys that hold shared TSL resources, whose reads useLocalNodes tracks. */
export const RESOURCE_KEYS: ReadonlySet<string> = new Set(['uniforms', 'nodes', 'buffers', 'gpuStorage', 'textures'])

/** The TSL hooks whose first argument is a creator run during render. */
export const CREATOR_HOOKS: ReadonlySet<string> = new Set([
  'useNodes',
  'useLocalNodes',
  'useUniforms',
  'useBuffers',
  'useGPUStorage',
])

/** The hook a call makes and its creator, when the first argument is (or names) a function. */
export function creatorOf(
  ctx: Rule.RuleContext,
  call: ESTree.CallExpression,
  hooks: ReadonlySet<string> = CREATOR_HOOKS,
): { hook: string; creator: FunctionNode } | undefined {
  const hook = calleeName(call.callee)
  if (!hook || !hooks.has(hook)) return undefined
  const creator = resolveFunction(ctx, call.arguments[0] as ESTree.Node | undefined)
  return creator && { hook, creator }
}

export interface StateBinding {
  /** The creator state key: `uniforms`, `scene`, ... */
  key: string
  variable: Scope.Variable
  /** `({ uniforms })` binds the key itself; `(state)` binds the whole state, read as `state.uniforms`. */
  whole: boolean
}

/**
 * The variables a creator's state parameter is bound to, for the given keys: each destructured key
 * (`({ uniforms, scene: s })`), or the whole parameter (`(state)`) for every key.
 */
export function stateBindings(ctx: Rule.RuleContext, creator: FunctionNode, keys: ReadonlySet<string>): StateBinding[] {
  const param = creator.params[0]
  if (!param) return []
  const scope = ctx.sourceCode.getScope(creator)
  const variable = (name: string) => scope.set.get(name)

  if (param.type === 'Identifier') {
    const whole = variable(param.name)
    return whole ? [...keys].map((key) => ({ key, variable: whole, whole: true })) : []
  }
  if (param.type !== 'ObjectPattern') return []

  const bindings: StateBinding[] = []
  for (const property of param.properties) {
    if (property.type !== 'Property' || property.key.type !== 'Identifier' || !keys.has(property.key.name)) continue
    const target = property.value.type === 'AssignmentPattern' ? property.value.left : property.value
    const bound = target.type === 'Identifier' ? variable(target.name) : undefined
    if (bound) bindings.push({ key: property.key.name, variable: bound, whole: false })
  }
  return bindings
}

/**
 * The node that reads `binding`'s key at `reference`: the identifier itself for a destructured key,
 * or the `state.key` member expression for a whole-state binding (undefined for any other use).
 */
export function keyRead(binding: StateBinding, reference: Scope.Reference): ESTree.Node | undefined {
  const identifier = reference.identifier as ESTree.Identifier & Rule.NodeParentExtension
  if (!binding.whole) return identifier
  const parent = identifier.parent
  if (parent?.type !== 'MemberExpression' || parent.object !== identifier) return undefined
  return calleeName(parent) === binding.key ? parent : undefined
}
