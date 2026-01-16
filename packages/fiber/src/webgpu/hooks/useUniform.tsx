import { useMemo } from 'react'
import { uniform } from '#three/tsl'
import { useStore } from '../../core/hooks'
// Note: UniformNode is a global type from types/tsl.d.ts
import type { Vector2, Vector3, Vector4, Color, Matrix3, Matrix4 } from '#three'

//* Types ==============================

/** Supported uniform value types */
export type UniformValue = number | boolean | Vector2 | Vector3 | Vector4 | Color | Matrix3 | Matrix4

/** Widen literal types to their base types (0 → number, true → boolean) */
type Widen<T> = T extends number ? number : T extends boolean ? boolean : T

/** Type guard to check if a value is a UniformNode */
const isUniformNode = (value: unknown): value is UniformNode =>
  value !== null && typeof value === 'object' && 'value' in value && 'uuid' in value

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
 *
 * // Create a uniform (or get existing + update value)
 * const uHeight = useUniform('uHeight', 0)
 * const uColor = useUniform('uColor', new THREE.Color('#ff0000'))
 *
 * // Access existing uniform
 * const uHeight = useUniform('uHeight')
 *
 * // Update from JS (GPU sees it immediately, no React re-render)
 * uHeight.value = 5.0
 *
 * // Update via the hook (also works)
 * useUniform('uHeight', newHeightValue)
 *
 * // Use in TSL
 * material.positionNode = positionLocal.add(normal.mul(uHeight))
 * ```
 */
export function useUniform<T extends UniformValue>(name: string, value?: T): UniformNode<Widen<T>> {
  const store = useStore()

  return useMemo(() => {
    const state = store.getState()
    const set = store.setState
    const existing = state.uniforms[name]

    // Case 1: Uniform exists ---------------------------------
    if (existing && isUniformNode(existing)) {
      // Update value if provided
      if (value !== undefined) {
        existing.value = value
      }
      return existing as UniformNode<Widen<T>>
    }

    // Case 2: Get-only mode but uniform doesn't exist ---------------------------------
    if (value === undefined) {
      throw new Error(
        `[useUniform] Uniform "${name}" not found. ` + `Create it first with: useUniform('${name}', initialValue)`,
      )
    }

    // Case 3: Create new uniform ---------------------------------
    const node = uniform(value) as UniformNode<Widen<T>>

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
  }, [store, name]) // Note: value intentionally excluded - updates happen imperatively
}

export default useUniform
