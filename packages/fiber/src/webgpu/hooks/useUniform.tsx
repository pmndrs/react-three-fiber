import { useMemo } from 'react'
import { uniform } from '#three/tsl'
import { Color as ThreeColor, Node } from '#three'

import type { Vector2, Vector3, Vector4, Color, Matrix3, Matrix4 } from '#three'
import { useStore, useThree } from '../../core/hooks'

//* Types ==============================

/**
 * Supported uniform value types:
 * - Raw values: number, boolean, Vector2, Vector3, Vector4, Color, Matrix3, Matrix4
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
  | Matrix3
  | Matrix4
  | Node // TSL nodes like color(), vec3(), float() for type casting
  | UniformNode // Allow passing existing uniform nodes

/**
 * Widen literal types to their base types:
 * - 0 → number
 * - true → boolean
 * - '#ff0000' → Color (string colors are converted to Color objects)
 * - Node → Node (TSL nodes passed through for uniform type casting)
 */
type Widen<T> = T extends number ? number : T extends boolean ? boolean : T extends string ? Color : T

/** Type guard to check if a value is a UniformNode */
const isUniformNode = (value: unknown): value is UniformNode =>
  value !== null && typeof value === 'object' && 'value' in value && 'uuid' in value

/** Type guard to check if a value is a TSL Node (but not a UniformNode) */
const isTSLNode = (value: unknown): value is Node =>
  value !== null && typeof value === 'object' && 'uuid' in value && 'nodeType' in value

//* Hook Overloads ==============================

// Get existing uniform (throws if not found)
export function useUniform<T extends UniformValue>(name: string): UniformNode<T>

// Create uniform if not exists, or update value if exists - widens literal types
export function useUniform<T extends UniformValue>(name: string, value: T): UniformNode<Widen<T>>

//* Hook Implementation ==============================

/**
 * Simple single-uniform hook with create/get/update semantics.
 *
 * - `useUniform('name', value)` - Creates if not exists, updates value if exists
 * - `useUniform('name')` - Gets existing uniform (throws if not found)
 *
 * @example
 * ```tsx
 * import { useUniform } from '@react-three/fiber/webgpu'
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
export function useUniform<T extends UniformValue>(name: string, value?: T): UniformNode<Widen<T>> {
  const store = useStore()

  // Subscribe to HMR version - when it changes, uniforms get re-created
  const hmrVersion = useThree((s) => s._hmrVersion)

  return useMemo(() => {
    const state = store.getState()
    const set = store.setState
    const existing = state.uniforms[name]

    // Case 1: Uniform exists in store ---------------------------------
    if (existing && isUniformNode(existing)) {
      // Update value if provided (but not for TSL nodes - those are immutable)
      if (value !== undefined && !isTSLNode(value) && !isUniformNode(value)) {
        existing.value = typeof value === 'string' ? new ThreeColor(value) : value
      }
      return existing as UniformNode<Widen<T>>
    }

    // Case 2: Get-only mode but uniform doesn't exist ---------------------------------
    if (value === undefined) {
      throw new Error(
        `[useUniform] Uniform "${name}" not found. ` + `Create it first with: useUniform('${name}', initialValue)`,
      )
    }

    // Case 3: Value is already a UniformNode ---------------------------------
    // Just register it to the store (e.g., from external library)
    if (isUniformNode(value)) {
      const node = value as unknown as UniformNode<Widen<T>>
      if (typeof node.setName === 'function') {
        node.setName(name)
      }
      set((s) => ({
        uniforms: { ...s.uniforms, [name]: node },
      }))
      return node
    }

    // Case 4: Create new uniform ---------------------------------
    let node: UniformNode<Widen<T>>

    if (isTSLNode(value)) {
      // TSL nodes (color(), vec3(), float()) - pass directly for type casting
      node = uniform(value) as unknown as UniformNode<Widen<T>>
    } else if (typeof value === 'string') {
      // String colors - convert to Three.js Color
      node = uniform(new ThreeColor(value)) as unknown as UniformNode<Widen<T>>
    } else {
      // Raw values (number, Vector3, Color, etc.)
      node = uniform(value) as unknown as UniformNode<Widen<T>>
    }

    // Label for debugging
    if (typeof node.setName === 'function') {
      node.setName(name)
    }

    // Register to store
    set((s) => ({
      uniforms: {
        ...s.uniforms,
        [name]: node,
      },
    }))

    return node
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, name, hmrVersion]) // Note: value intentionally excluded - updates happen imperatively
}

export default useUniform
