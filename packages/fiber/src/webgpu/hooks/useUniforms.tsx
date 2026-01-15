import { useCallback, useMemo } from 'react'
import { useStore } from '../../core/hooks'
import type { RootState } from '#types'
import * as THREE from '#three'
import { uniform } from '#three/tsl'
import { vectorize } from './utils'
import { useCompareMemoize } from './useCompareMemoize'
import { is } from '../../core/utils'

//* Types ==============================

/** Creator function that returns uniform inputs (can be raw values or UniformNodes) */
export type UniformCreator<T extends UniformInputRecord = UniformInputRecord> = (state: RootState) => T

/** Function signature for removeUniforms util */
export type RemoveUniformsFn = (names: string | string[], scope?: string) => void

/** Function signature for clearUniforms util */
export type ClearUniformsFn = (scope?: string) => void

/** Return type with utils included */
export type UniformsWithUtils<T extends UniformRecord = UniformRecord> = T & {
  removeUniforms: RemoveUniformsFn
  clearUniforms: ClearUniformsFn
}

/** Type guard to check if a value is a UniformNode vs a scope object */
const isUniformNode = (value: unknown): value is UniformNode =>
  value !== null && typeof value === 'object' && 'value' in value && 'uuid' in value

//* Hook Overloads ==============================

// Get all uniforms (returns full structure with root uniforms and scopes + utils)
export function useUniforms(): UniformsWithUtils<UniformRecord & Record<string, UniformRecord>>

// Get uniforms from a specific scope (+ utils)
export function useUniforms(scope: string): UniformsWithUtils

// Create/get uniforms at root level (no scope) - function (+ utils)
export function useUniforms<T extends UniformInputRecord>(
  creator: UniformCreator<T>,
): UniformsWithUtils<UniformRecord<UniformNode>>

// Create/get uniforms within a scope - function (+ utils)
export function useUniforms<T extends UniformInputRecord>(
  creator: UniformCreator<T>,
  scope: string,
): UniformsWithUtils<UniformRecord<UniformNode>>

// Create/get uniforms at root level (no scope) - object (+ utils)
export function useUniforms<T extends UniformInputRecord>(uniforms: T): UniformsWithUtils<UniformRecord<UniformNode>>

// Create/get uniforms within a scope - object (+ utils)
export function useUniforms<T extends UniformInputRecord>(
  uniforms: T,
  scope: string,
): UniformsWithUtils<UniformRecord<UniformNode>>

//* Hook Implementation ==============================

/**
 * Hook for managing global TSL uniform nodes with create-if-not-exists pattern.
 *
 * **Performance optimized:**
 * - Deep-compares input values to prevent unnecessary GPU updates
 * - Functions execute on every render but only update GPU when values change
 * - Existing uniforms are reused across components
 *
 * **Storage:**
 * - Root uniforms: `state.uniforms.uName`
 * - Scoped uniforms: `state.uniforms[scope].uName`
 *
 * **Inputs:**
 * - Raw values: numbers, strings, Three.js types (auto-wrapped in uniform())
 * - Plain objects: `{x, y, z}` auto-converted to Vector2/3/4
 * - TSL nodes: `uniform(float(5))`, `vec3(1, 0, 0)`, etc.
 *
 * @example
 * ```tsx
 * import * as THREE from 'three/webgpu'
 *
 * // Simple object syntax (most common)
 * const { uTime, uColor } = useUniforms({
 *   uTime: 0,
 *   uColor: '#ff0000'
 * })
 *
 * // Supports Three.js types
 * const { uPosition } = useUniforms({
 *   uPosition: new THREE.Vector3(0, 1, 0)
 * })
 *
 * // Plain objects auto-convert to vectors (great for Leva)
 * const { uColor } = useUniforms({
 *   uColor: { x: 1, y: 0, z: 0 } // becomes Vector3
 * })
 *
 * // Function syntax for reactive values or accessing state
 * const [time, setTime] = useState(0)
 * const { uTime } = useUniforms(() => ({
 *   uTime: time // captures current value
 * }))
 * // OR access R3F state:
 * const { uCameraPos } = useUniforms((state) => ({
 *   uCameraPos: state.camera.position
 * }))
 *
 * // Scoped uniforms (prevent naming conflicts)
 * const { uHealth } = useUniforms({ uHealth: 100 }, 'player')
 * const { uHealth: enemyHealth } = useUniforms({ uHealth: 50 }, 'enemy')
 *
 * // Read existing uniforms from a scope
 * const playerUniforms = useUniforms('player')
 *
 * // Get all uniforms (root + scopes)
 * const allUniforms = useUniforms()
 * // => { uTime, uColor, player: { uHealth }, enemy: { uHealth } }
 *
 * // Update uniform value (GPU-only, no React re-render)
 * uTime.value = performance.now() * 0.001
 * ```
 */
export function useUniforms<T extends UniformInputRecord = UniformInputRecord>(
  creatorOrScope?: UniformCreator<T> | T | string,
  scope?: string,
): UniformsWithUtils<UniformRecord> | UniformsWithUtils<UniformRecord & Record<string, UniformRecord>> {
  const store = useStore()

  //* Utils ==============================
  // Memoized util functions that capture store reference

  /** Remove uniforms by name from root or a scope */
  const removeUniforms = useCallback<RemoveUniformsFn>(
    (names, targetScope) => {
      const nameArray = Array.isArray(names) ? names : [names]
      store.setState((state) => {
        if (targetScope) {
          // Remove from scoped uniforms
          const currentScope = { ...(state.uniforms[targetScope] as UniformRecord) }
          for (const name of nameArray) delete currentScope[name]
          return { uniforms: { ...state.uniforms, [targetScope]: currentScope } }
        }
        // Remove from root level
        const uniforms = { ...state.uniforms }
        for (const name of nameArray) if (isUniformNode(uniforms[name])) delete uniforms[name]
        return { uniforms }
      })
    },
    [store],
  )

  /** Clear uniforms - scope name, 'root' for root only, or undefined for all */
  const clearUniforms = useCallback<ClearUniformsFn>(
    (targetScope) => {
      store.setState((state) => {
        // Clear specific scope
        if (targetScope && targetScope !== 'root') {
          const { [targetScope]: _, ...rest } = state.uniforms
          return { uniforms: rest }
        }
        // Clear root only (preserve scopes)
        if (targetScope === 'root') {
          const uniforms: typeof state.uniforms = {}
          for (const [key, value] of Object.entries(state.uniforms)) {
            if (!isUniformNode(value)) uniforms[key] = value
          }
          return { uniforms }
        }
        // Clear everything
        return { uniforms: {} }
      })
    },
    [store],
  )

  //* Input Processing ==============================
  // Execute functions immediately to capture reactive values, then deep-compare output.
  // This allows: useUniforms(() => ({ uTime: time })) to work without useCallback wrapping.
  // Function runs every render, but GPU only updates when result values change.
  const inputForMemoization = useMemo(() => {
    return is.fun(creatorOrScope) ? creatorOrScope(store.getState()) : creatorOrScope
  }, [creatorOrScope, store])

  // Deep-compare to detect actual value changes (not just reference changes)
  // Prevents: useUniforms({ uColor: 'blue' }) from updating every render
  const memoizedInput = useCompareMemoize(inputForMemoization, true)

  //* Main Logic ==============================
  const uniforms = useMemo(() => {
    const state = store.getState()
    const set = store.setState

    // Read-only: Return all uniforms
    if (memoizedInput === undefined) {
      return state.uniforms as UniformRecord & Record<string, UniformRecord>
    }

    // Read-only: Return uniforms from specific scope
    if (typeof memoizedInput === 'string') {
      const scopeData = state.uniforms[memoizedInput]
      if (scopeData && !isUniformNode(scopeData)) return scopeData as UniformRecord
      return {}
    }

    // Create/update: Process uniform definitions
    if (typeof memoizedInput !== 'object' || memoizedInput === null) {
      throw new Error('Invalid uniform input')
    }

    const created = memoizedInput as UniformRecord
    const result: Record<string, UniformNode> = {}
    let hasNewUniforms = false

    // Determine target location (root or scope)
    let targetRecord: UniformRecord = state.uniforms as UniformRecord
    if (scope) {
      if (!state.uniforms[scope]) state.uniforms[scope] = {}
      targetRecord = state.uniforms[scope] as UniformRecord
    }

    // Process each uniform definition
    for (const [name, node] of Object.entries(created)) {
      if (targetRecord[name]) {
        // Uniform exists - reuse it but check if value changed
        result[name] = targetRecord[name]
        const existingVal = result[name].value
        const newVal = vectorize(node)

        // Efficient equality checking
        let equals = newVal === existingVal // Fast path: primitives and same references
        if (!equals && hasEqualsMethod(existingVal) && hasEqualsMethod(newVal)) {
          // Three.js types: use native .equals() methods
          if (isThreeVector(existingVal) && isThreeVector(newVal)) {
            equals = vectorEquals(existingVal, newVal)
          } else if (isSameThreeType(existingVal, newVal)) {
            equals = (existingVal as any).equals(newVal)
          }
        }

        // Only update GPU if value actually changed
        if (!equals) result[name].value = newVal
      } else {
        // New uniform - create it
        result[name] = createUniform(name, node, scope)
        hasNewUniforms = true
      }
    }

    // Only update React state if new uniforms were created
    // Value changes don't trigger state updates (GPU-only)
    if (hasNewUniforms) {
      if (scope) {
        set((s) => ({
          uniforms: {
            ...s.uniforms,
            [scope]: { ...(s.uniforms[scope] as UniformRecord), ...result },
          },
        }))
      } else {
        set((s) => ({ uniforms: { ...s.uniforms, ...result } }))
      }
    }

    return result as UniformRecord
  }, [store, memoizedInput, scope])

  // Return uniforms with utils
  return { ...uniforms, removeUniforms, clearUniforms } as UniformsWithUtils<UniformRecord>
}

//* Standalone Utils (Deprecated) ==============================
// These require manual store access. Prefer the utils returned from useUniforms() instead.

/**
 * Remove uniforms by name from root level or a scope
 * @deprecated Use `const { removeUniforms } = useUniforms()` instead
 */
export function removeUniforms(set: ReturnType<typeof useStore>['setState'], names: string[], scope?: string) {
  set((state) => {
    if (scope) {
      const currentScope = { ...(state.uniforms[scope] as UniformRecord) }
      for (const name of names) delete currentScope[name]
      return { uniforms: { ...state.uniforms, [scope]: currentScope } }
    }
    const uniforms = { ...state.uniforms }
    for (const name of names) if (isUniformNode(uniforms[name])) delete uniforms[name]
    return { uniforms }
  })
}

/**
 * Clear all uniforms from a scope (removes the entire scope object)
 * @deprecated Use `const { clearUniforms } = useUniforms()` instead
 */
export function clearScope(set: ReturnType<typeof useStore>['setState'], scope: string) {
  set((state) => {
    const { [scope]: _, ...rest } = state.uniforms
    return { uniforms: rest }
  })
}

/**
 * Clear all root-level uniforms (preserves scopes)
 * @deprecated Use `const { clearUniforms } = useUniforms()` with `clearUniforms('root')` instead
 */
export function clearRootUniforms(set: ReturnType<typeof useStore>['setState']) {
  set((state) => {
    const uniforms: typeof state.uniforms = {}
    for (const [key, value] of Object.entries(state.uniforms)) {
      if (!isUniformNode(value)) uniforms[key] = value
    }
    return { uniforms }
  })
}

export default useUniforms

//* Helper Functions ==============================

/**
 * Creates a TSL uniform node from various input types
 * - Already a UniformNode: returns as-is
 * - Plain objects: converted to vectors via vectorize()
 * - Raw values: wrapped in uniform()
 */
function createUniform(inName: string, node: any, scope?: string): UniformNode {
  if (node.type === 'UniformNode') return node

  const inValue = vectorize(node) // Convert plain objects to Three.js types
  const newUniform = uniform(inValue) as UniformNode

  // Set debug name for easier identification in GPU tools
  // Use underscore instead of dot to ensure WGSL compatibility
  if (typeof newUniform.setName === 'function') {
    const name = scope ? `${scope}_${inName}` : inName
    newUniform.setName(name)
  }

  return newUniform
}

/** Type guard for Three.js Vector2/3/4 */
function isThreeVector(inVector: unknown): boolean {
  if (!inVector) return false
  return (
    (inVector as THREE.Vector2).isVector2 ||
    (inVector as THREE.Vector3).isVector3 ||
    (inVector as THREE.Vector4).isVector4
  )
}

/** Type-safe equality check for Vector2/3/4 */
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

/** Check if value has a .equals() method */
function hasEqualsMethod(value: unknown): boolean {
  return value !== null && typeof value === 'object' && 'equals' in value && typeof (value as any).equals === 'function'
}

/** Check if two values are the same Three.js type (Color, Matrix, Euler, Quaternion) */
function isSameThreeType(a: unknown, b: unknown): boolean {
  const obj_a = a as any
  const obj_b = b as any

  return (
    (obj_a.isColor && obj_b.isColor) ||
    (obj_a.isMatrix3 && obj_b.isMatrix3) ||
    (obj_a.isMatrix4 && obj_b.isMatrix4) ||
    (obj_a.isEuler && obj_b.isEuler) ||
    (obj_a.isQuaternion && obj_b.isQuaternion)
  )
}
