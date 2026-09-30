import { uniform } from 'three/tsl'
import { Color as ThreeColor, Node } from 'three/webgpu'

import type { Vector2, Vector3, Vector4, Color, Matrix2, Matrix3, Matrix4 } from 'three/webgpu'
import { usePrimaryStore } from './internal/usePrimaryStore'
import { ROOT_SCOPE, peekStaged } from './internal/resourceRegistry'
import { isTSLNode, isUniformNode } from './internal/resourceGuards'
import { useScopedResource } from './internal/useScopedResource'
import { useCompareMemoize } from './internal/useCompareMemoize'
import { vectorize } from './internal/utils'
import type { RegisteredUniform, RegisteredUniforms } from './register'

/**
 * `uniform()` typed to its documented runtime contract.
 *
 * three's JSDoc for `uniform` reads `@param {any|string} value` — the implementation accepts any
 * value and derives the node type from it. Its `.d.ts`, however, enumerates a closed overload set
 * (number, boolean, Vector2-4, Matrix2-4, Color, InputNode, VarNode). R3F's public input type is
 * deliberately wider — plain `{ x, y, z }` objects and CSS colour strings are supported and
 * normalised before they reach here — so a generic `T` can never be proven to select one of those
 * overloads, and a union argument cannot select among them either.
 *
 * The mismatch is isolated to this one named seam while preserving the shader and value types
 * inferred from each input against the installed three declarations.
 */
const uniformOf = uniform as <T extends UniformValue>(value: T, type?: string) => UniformNodeFor<T>

//* Types ==============================

/**
 * Supported uniform value types:
 * - Raw values: number, boolean, Vector2, Vector3, Vector4, Color, Matrix2, Matrix3, Matrix4
 * - String colors: '#ff0000', 'red', 'rgb(255,0,0)' (auto-converted to Color)
 * - TSL nodes: color(), vec3(), float(), etc. (for type casting)
 * - UniformNode: existing uniforms (reused as-is)
 */
export type UniformValue =
  | number
  | boolean
  | string
  | Vector2
  | Vector3
  | Vector4
  | Color
  | Matrix2
  | Matrix3
  | Matrix4
  | Node // TSL nodes like color(), vec3(), float() for type casting
  | UniformNode // Allow passing existing uniform nodes

//* Hook Overloads ==============================

// Get a registered uniform: typed by name, no generic needed (see ./register)
export function useUniform<K extends keyof RegisteredUniforms & string>(name: K): RegisteredUniform<K>

// Get existing uniform (throws if not found)
export function useUniform<T extends UniformValue = UniformValue>(name: string): UniformNodeFor<T>

// Create uniform if not exists, or update value if exists
export function useUniform<T extends UniformValue>(name: string, value: T): UniformNodeFor<T>

//* Hook Implementation ==============================

/**
 * Simple single-uniform hook with create/get/update semantics.
 *
 * - `useUniform('name', value)` - Creates if not exists, updates value if exists
 * - `useUniform('name')` - Gets existing uniform (throws if not found)
 *
 * The value is tracked: when a later render passes a different `value` (deep-compared, so an
 * equal but freshly constructed object does not count), the uniform's `.value` is updated in
 * place. The node itself is never recreated, so materials using it do not recompile.
 *
 * @example
 * ```tsx
 * import { useUniform } from '@react-three/tsl'
 * import { color, vec3, float } from 'three/tsl'
 *
 * // Raw values
 * const uHeight = useUniform('uHeight', 0)
 * const uColor = useUniform('uColor', new THREE.Color('#ff0000'))
 *
 * // String colors (auto-converted to Color)
 * const uTint = useUniform('uTint', '#00ff00')
 *
 * // TSL nodes for type casting (creates typed uniforms)
 * const uColorNode = useUniform('uColorNode', color('#ff0000'))
 * const uPosition = useUniform('uPosition', vec3(0, 1, 0))
 * const uIntensity = useUniform('uIntensity', float(1.5))
 *
 * // Access existing uniform
 * const uHeight = useUniform('uHeight')
 *
 * // Update from JS (GPU sees it immediately, no React re-render)
 * uHeight.value = 5.0
 *
 * // Use in TSL
 * material.positionNode = positionLocal.add(normal.mul(uHeight))
 * ```
 */
export function useUniform<T extends UniformValue = UniformValue>(name: string, value?: T): UniformNodeFor<T> {
  // The primary canvas's store, like every other resource hook: on a secondary canvas this used to
  // register on the local store, where useUniforms never looked.
  const store = usePrimaryStore()

  // Memo trigger: the name alone in get-only mode, otherwise the name plus the normalized value,
  // deep-compared like useUniforms. A changed value re-runs the registration memo and reaches
  // `reconcile`; a value that is only referentially new (an inline `new Color('red')`, a fresh
  // `color('red')` node) compares equal and leaves the uniform alone, so an imperative
  // `node.value` write is not clobbered by a re-render whose prop did not change.
  const memoizedInput = useCompareMemoize(value === undefined ? name : { [name]: normalizeValue(value) }, true)

  // Create mode: register through the shared staged mechanism (render-phase
  // creation, commit-phase store write, generation-aware reuse). In get-only
  // mode this stages nothing and returns {}.
  const registered = useScopedResource<UniformValue, UniformNode>({
    store,
    kind: 'uniforms',
    scope: undefined,
    isLeaf: isUniformNode,
    input: memoizedInput,
    create: () => (value === undefined ? {} : { [name]: value }),
    prepare: createNamedUniform,
    reconcile: (existing) => {
      // An existing UniformNode is registered as-is: there is no value to sync from it.
      if (value === undefined || isUniformNode(value)) return
      const next = normalizeValue(value)
      // A TSL node with no constant to extract (e.g. `positionLocal`) has no value to write.
      if (isTSLNode(next)) return
      existing.value = next
    },
  })
  if (registered[name]) return registered[name] as UniformNodeFor<T>

  // Get-only mode: return the uniform another hook registered — committed, or
  // staged earlier in this same render pass (not yet flushed).
  const existing = peekStaged(store, 'uniforms', ROOT_SCOPE)?.[name] ?? store.getState().uniforms[name]
  if (existing && isUniformNode(existing)) return existing as UniformNodeFor<T>

  throw new Error(
    `[useUniform] Uniform "${name}" not found. ` + `Create it first with: useUniform('${name}', initialValue)`,
  )
}

/**
 * The JS value a uniform stores for an input: CSS colour strings become a Color (as on creation),
 * plain `{ x, y, z }` / `{ r, g, b }` objects become vectors / colours, and TSL constant nodes
 * (`color('red')`, `vec3(0, 1, 0)`, `float(1)`) yield the value they wrap.
 */
function normalizeValue(value: UniformValue): unknown {
  return typeof value === 'string' ? new ThreeColor(value) : vectorize(value)
}

/** Build the stored UniformNode for a fresh registration (see useUniform cases). */
function createNamedUniform(name: string, value: UniformValue): UniformNode {
  let node: UniformNode

  if (isUniformNode(value)) {
    // Already a UniformNode - register it to the store as-is (e.g., from external library)
    node = value
  } else if (isTSLNode(value)) {
    // TSL nodes (color(), vec3(), float()) - pass directly for type casting
    node = uniformOf(value)
  } else if (typeof value === 'string') {
    // String colors - convert to Three.js Color (matches three's `(value: Color)` overload)
    node = uniform(new ThreeColor(value)) as unknown as UniformNode
  } else {
    // Raw values (number, Vector3, Color, etc.)
    node = uniformOf(value)
  }

  // Label for debugging
  if (typeof node.setName === 'function') {
    node.setName(name)
  }

  return node
}

export default useUniform
