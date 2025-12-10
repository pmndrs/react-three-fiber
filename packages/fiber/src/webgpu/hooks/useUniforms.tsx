import { useMemo } from 'react'
import { useStore } from '../../core/hooks'
import type { RootState } from '#types'

//* Types ==============================

export interface UniformNode<T = any> {
  value: T
  label?: (name: string) => UniformNode<T>
  // TSL nodes have more properties but these are what we care about
  [key: string]: any
}

export type UniformRecord = Record<string, UniformNode>
export type UniformCreator<T extends UniformRecord> = (state: RootState) => T

/** Default scope for uniforms without explicit scope */
export const DEFAULT_SCOPE = '_'

//* Hook Overloads ==============================

// Get all uniforms (returns full scoped structure)
export function useUniform(): Record<string, UniformRecord>

// Get uniforms from a specific scope
export function useUniform(scope: string): UniformRecord

// Create/get uniforms with optional scope
export function useUniform<T extends UniformRecord>(creator: UniformCreator<T>, scope?: string): T

//* Hook Implementation ==============================

/**
 * Hook for managing global TSL uniform nodes with create-if-not-exists pattern.
 *
 * Uniforms are organized by scope for namespacing. Default scope is '_'.
 * When a creator function is provided, uniforms are created if they don't exist.
 *
 * @example
 * ```tsx
 * import { uniform, float, vec3, color } from 'three/tsl'
 *
 * // Create uniforms (only created once, retrieved on subsequent calls)
 * const { uTime, uColor } = useUniform(() => ({
 *   uTime: uniform(float(0)),
 *   uColor: uniform(color('#ff0000')),
 * }))
 *
 * // Create scoped uniforms
 * const { uPlayerHealth } = useUniform(() => ({
 *   uPlayerHealth: uniform(float(100)),
 * }), 'player')
 *
 * // Access existing uniforms from default scope
 * const { uTime } = useUniform('_')
 *
 * // Access existing uniforms from a specific scope
 * const playerUniforms = useUniform('player')
 *
 * // Get all uniforms (all scopes)
 * const allUniforms = useUniform()
 * // allUniforms = { _: { uTime, uColor }, player: { uPlayerHealth } }
 *
 * // Update uniform value (GPU sees it, no React re-render)
 * uTime.value = performance.now() * 0.001
 * ```
 */
export function useUniform<T extends UniformRecord>(
  creatorOrScope?: UniformCreator<T> | string,
  scope?: string,
): T | UniformRecord | Record<string, UniformRecord> {
  const store = useStore()

  return useMemo(() => {
    const state = store.getState()
    const set = store.setState

    // Case 1: No arguments - return all uniforms
    if (creatorOrScope === undefined) {
      return state.uniforms
    }

    // Case 2: String argument - return uniforms from that scope
    if (typeof creatorOrScope === 'string') {
      return state.uniforms[creatorOrScope] ?? {}
    }

    // Case 3: Creator function - create if not exists
    const creator = creatorOrScope
    const targetScope = scope ?? DEFAULT_SCOPE

    // Run the creator to get the uniform definitions
    const created = creator(state)
    const result: Record<string, UniformNode> = {}

    // Ensure scope exists
    const currentScope = state.uniforms[targetScope] ?? {}
    let hasNewUniforms = false

    for (const [name, node] of Object.entries(created)) {
      // Check if uniform already exists in this scope
      if (currentScope[name]) {
        // Already exists - use existing
        result[name] = currentScope[name]
      } else {
        // Doesn't exist - add it
        // Apply label if the node supports it (for TSL debugging)
        if (typeof node.label === 'function') {
          const labelName = targetScope === DEFAULT_SCOPE ? name : `${targetScope}.${name}`
          node.label(labelName)
        }
        result[name] = node
        hasNewUniforms = true
      }
    }

    // Update store if we created new uniforms
    if (hasNewUniforms) {
      set((s) => ({
        uniforms: {
          ...s.uniforms,
          [targetScope]: {
            ...s.uniforms[targetScope],
            ...result,
          },
        },
      }))
    }

    return result as T
  }, [store, typeof creatorOrScope === 'string' ? creatorOrScope : scope])
}

//* Utility Functions ==============================

/**
 * Remove uniforms by name from a scope
 */
export function removeUniforms(
  set: ReturnType<typeof useStore>['setState'],
  names: string[],
  scope: string = DEFAULT_SCOPE,
) {
  set((state) => {
    const currentScope = { ...state.uniforms[scope] }
    for (const name of names) {
      delete currentScope[name]
    }
    return {
      uniforms: {
        ...state.uniforms,
        [scope]: currentScope,
      },
    }
  })
}

/**
 * Clear all uniforms from a scope
 */
export function clearScope(set: ReturnType<typeof useStore>['setState'], scope: string = DEFAULT_SCOPE) {
  set((state) => {
    const { [scope]: _, ...rest } = state.uniforms
    return { uniforms: rest }
  })
}

export default useUniform
