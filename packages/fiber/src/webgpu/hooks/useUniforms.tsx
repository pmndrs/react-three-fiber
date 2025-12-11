import { useMemo } from 'react'
import { useStore } from '../../core/hooks'
import type { RootState } from '#types'
import * as THREE from '#three'
import { uniform } from 'three/tsl'
import { vectorize } from './utils'
import { Vector4 } from 'three'

//* Types ==============================

export type UniformCreator<T extends UniformRecord> = (state: RootState) => T

/** Type guard to check if a value is a UniformNode vs a scope object */
const isUniformNode = (value: unknown): value is UniformNode =>
  value !== null && typeof value === 'object' && 'value' in value && 'uuid' in value

//* Hook Overloads ==============================

// Get all uniforms (returns full structure with root uniforms and scopes)
export function useUniforms(): UniformRecord

// Get uniforms from a specific scope
export function useUniforms(scope: string): UniformRecord

// Create/get uniforms at root level (no scope) - function
export function useUniforms<T extends UniformRecord>(creator: UniformCreator<T>): T

// Create/get uniforms within a scope - function
export function useUniforms<T extends UniformRecord>(creator: UniformCreator<T>, scope: string): T

// Create/get uniforms at root level (no scope) - object
export function useUniforms<T extends UniformRecord>(uniforms: T): T

// Create/get uniforms within a scope - object
export function useUniforms<T extends UniformRecord>(uniforms: T, scope: string): T

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
 * // Create with function (for access to state)
 * const { uTime, uColor } = useUniforms(() => ({
 *   uTime: uniform(float(0)),
 *   uColor: uniform(color('#ff0000')),
 * }))
 *
 * // Create with object (simpler when you don't need state)
 * const { uSpeed, uPosition } = useUniforms({
 *   uSpeed: 5,
 *   uPosition: new THREE.Vector3(0, 1, 0)
 * })
 *
 * // Also supports plain objects (from Leva, etc.)
 * const { uColor } = useUniforms({
 *   uColor: { x: 1, y: 0, z: 0 } // auto-converted to Vector3
 * })
 *
 * // Create scoped uniforms
 * const { uPlayerHealth } = useUniforms({
 *   uPlayerHealth: 100
 * }, 'player')
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

    // Future cases are an object or a returned object from a function
    let created: UniformRecord | undefined
    const result: Record<string, UniformNode> = {}
    let hasNewUniforms = false

    // Case 3: Creator function - create if not exists
    if (typeof creatorOrScope === 'function') {
      const creator = creatorOrScope
      created = creator(state)
    }
    // Case 4: Object argument
    else if (typeof creatorOrScope === 'object') {
      created = creatorOrScope
    }

    if (!created) throw new Error('No uniforms created')

    // TypeScript doesn't narrow after throw, so we assert here
    const uniforms = created as UniformRecord

    // if there is a scope we want a child of the uniforms object, we might have to create it
    let targetRecord: UniformRecord = state.uniforms as UniformRecord
    if (scope) {
      // check it exists, or create it
      if (!state.uniforms[scope]) state.uniforms[scope] = {}
      targetRecord = state.uniforms[scope] as UniformRecord
    }
    for (const [name, node] of Object.entries(uniforms)) {
      // already exists in state
      if (targetRecord[name]) {
        // assign to the result object
        result[name] = targetRecord[name]
        const existingVal = result[name].value
        const newVal = vectorize(node)

        let equals = newVal === existingVal
        // check if the existing uniform is a vector
        if (isThreeVector(existingVal) && isThreeVector(newVal)) {
          equals = vectorEquals(existingVal, newVal)
        }
        if (!equals) result[name].value = newVal
      } else {
        result[name] = createUniform(name, node, scope)
        hasNewUniforms = true
      }
    }

    if (hasNewUniforms) {
      if (scope) {
        set((s) => ({
          uniforms: {
            ...s.uniforms,
            [scope]: {
              ...(s.uniforms[scope] as UniformRecord),
              ...result,
            },
          },
        }))
      } else {
        set((s) => ({
          uniforms: {
            ...s.uniforms,
            ...result,
          },
        }))
      }
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

function createUniform(inName: string, node: any, scope?: string): UniformNode {
  // check if the input is a uniform or a value type
  if (node.type === 'UniformNode') return node

  // make a new uniform from the input
  const inValue = vectorize(node)
  // note: because of leva we will need to process vectors
  const newUniform = uniform(inValue) as UniformNode
  // apply label for debugging
  if (typeof newUniform.setName === 'function') {
    const name = scope ? `${scope}.${inName}` : inName
    newUniform.setName(name)
  }

  return newUniform
}

function isThreeVector(inVector: unknown): boolean {
  if (!inVector) return false
  if (
    (inVector as THREE.Vector2).isVector2 ||
    (inVector as THREE.Vector3).isVector3 ||
    (inVector as THREE.Vector4).isVector4
  )
    return true
  return false
}

function vectorEquals(a: unknown, b: unknown): boolean {
  if ((a as THREE.Vector2).isVector2 && (b as THREE.Vector2).isVector2) {
    return (a as THREE.Vector2).equals(b as THREE.Vector2)
  }
  if ((a as THREE.Vector3).isVector3 && (b as THREE.Vector3).isVector3) {
    return (a as THREE.Vector3).equals(b as THREE.Vector3)
  }
  if ((a as THREE.Vector4).isVector4 && (b as THREE.Vector4).isVector4) {
    return (a as THREE.Vector4).equals(b as THREE.Vector4)
  }
  return false
}
