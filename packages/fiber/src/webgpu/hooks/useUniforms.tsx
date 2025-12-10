import { useMemo } from 'react'
import { useStore } from '../../core/hooks'
import type { RootState } from '#types'
import type { Node } from 'three/webgpu'

//* Types ==============================

/** Uniform node type - a Node with a value property (matches Three.js UniformNode) */
export interface UniformNode<T = unknown> extends Node {
  value: T
}

export type UniformRecord<T extends UniformNode = UniformNode> = Record<string, T>
export type UniformCreator<T extends UniformRecord> = (state: RootState) => T

/** Type guard to check if a value is a UniformNode vs a scope object */
const isUniformNode = (value: unknown): value is UniformNode =>
  value !== null && typeof value === 'object' && 'value' in value && 'uuid' in value

//* Hook Overloads ==============================

// Get all uniforms (returns full structure with root uniforms and scopes)
export function useUniforms(): UniformRecord

// Get uniforms from a specific scope
export function useUniforms(scope: string): UniformRecord

// Create/get uniforms at root level (no scope)
export function useUniforms<T extends UniformRecord>(creator: UniformCreator<T>): T

// Create/get uniforms within a scope
export function useUniforms<T extends UniformRecord>(creator: UniformCreator<T>, scope: string): T

//* Hook Implementation ==============================

/**
 * Hook for managing global TSL uniform nodes with create-if-not-exists pattern.
 *
 * Uniforms at root level are stored directly on state.uniforms.
 * Scoped uniforms are stored under state.uniforms[scope].
 *
 * @example
 * ```tsx
 * import { uniform, float, vec3, color } from 'three/tsl'
 *
 * // Create root-level uniforms (stored at state.uniforms.uTime, etc.)
 * const { uTime, uColor } = useUniforms(() => ({
 *   uTime: uniform(float(0)),
 *   uColor: uniform(color('#ff0000')),
 * }))
 *
 * // Create scoped uniforms (stored at state.uniforms.player.uPlayerHealth)
 * const { uPlayerHealth } = useUniforms(() => ({
 *   uPlayerHealth: uniform(float(100)),
 * }), 'player')
 *
 * // Access existing uniforms from a specific scope
 * const playerUniforms = useUniforms('player')
 *
 * // Get all uniforms (root + scopes)
 * const allUniforms = useUniforms()
 * // allUniforms = { uTime, uColor, player: { uPlayerHealth } }
 *
 * // Update uniform value (GPU sees it, no React re-render)
 * uTime.value = performance.now() * 0.001
 * ```
 */
export function useUniforms<T extends UniformRecord>(
  creatorOrScope?: UniformCreator<T> | string,
  scope?: string,
): T | UniformRecord | (UniformRecord & Record<string, UniformRecord>) {
  const store = useStore()

  return useMemo(() => {
    const state = store.getState()
    const set = store.setState

    // Case 1: No arguments - return all uniforms (root + scopes)
    if (creatorOrScope === undefined) {
      return state.uniforms as UniformRecord & Record<string, UniformRecord>
    }

    // Case 2: String argument - return uniforms from that scope
    if (typeof creatorOrScope === 'string') {
      const scopeData = state.uniforms[creatorOrScope]
      // Make sure we're returning a scope object, not a uniform node
      if (scopeData && !isUniformNode(scopeData)) {
        return scopeData as UniformRecord
      }
      return {}
    }

    // Case 3: Creator function - create if not exists
    const creator = creatorOrScope
    const created = creator(state)
    const result: Record<string, UniformNode> = {}
    let hasNewUniforms = false

    // Scoped uniforms ---------------------------------
    if (scope) {
      const currentScope = (state.uniforms[scope] as UniformRecord) ?? {}

      for (const [name, node] of Object.entries(created)) {
        if (currentScope[name]) {
          result[name] = currentScope[name]
        } else {
          // Apply label for debugging
          if (typeof node.label === 'function') {
            node.setName(`${scope}.${name}`)
          }
          result[name] = node
          hasNewUniforms = true
        }
      }

      if (hasNewUniforms) {
        set((s) => ({
          uniforms: {
            ...s.uniforms,
            [scope]: {
              ...(s.uniforms[scope] as UniformRecord),
              ...result,
            },
          },
        }))
      }

      return result as T
    }

    // Root-level uniforms ---------------------------------
    for (const [name, node] of Object.entries(created)) {
      const existing = state.uniforms[name]
      if (existing && isUniformNode(existing)) {
        result[name] = existing as UniformNode
      } else {
        // Apply label for debugging
        if (typeof node.label === 'function') {
          node.setName(name)
        }
        result[name] = node
        hasNewUniforms = true
      }
    }

    if (hasNewUniforms) {
      set((s) => ({
        uniforms: {
          ...s.uniforms,
          ...result,
        },
      }))
    }

    return result as T
  }, [store, typeof creatorOrScope === 'string' ? creatorOrScope : scope])
}

//* Utility Functions ==============================

/**
 * Remove uniforms by name from root level or a scope
 * @param scope - If provided, removes from that scope. Otherwise removes from root.
 */
export function removeUniforms(set: ReturnType<typeof useStore>['setState'], names: string[], scope?: string) {
  set((state) => {
    if (scope) {
      // Remove from scoped uniforms
      const currentScope = { ...(state.uniforms[scope] as UniformRecord) }
      for (const name of names) {
        delete currentScope[name]
      }
      return {
        uniforms: {
          ...state.uniforms,
          [scope]: currentScope,
        },
      }
    }

    // Remove from root level
    const uniforms = { ...state.uniforms }
    for (const name of names) {
      if (isUniformNode(uniforms[name])) {
        delete uniforms[name]
      }
    }
    return { uniforms }
  })
}

/**
 * Clear all uniforms from a scope (removes the entire scope object)
 */
export function clearScope(set: ReturnType<typeof useStore>['setState'], scope: string) {
  set((state) => {
    const { [scope]: _, ...rest } = state.uniforms
    return { uniforms: rest }
  })
}

/**
 * Clear all root-level uniforms (preserves scopes)
 */
export function clearRootUniforms(set: ReturnType<typeof useStore>['setState']) {
  set((state) => {
    const uniforms: typeof state.uniforms = {}
    // Keep only scope objects, remove root-level uniforms
    for (const [key, value] of Object.entries(state.uniforms)) {
      if (!isUniformNode(value)) {
        uniforms[key] = value
      }
    }
    return { uniforms }
  })
}

export default useUniforms
