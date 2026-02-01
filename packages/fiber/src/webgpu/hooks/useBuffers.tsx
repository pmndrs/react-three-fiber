import { useCallback, useMemo } from 'react'
import { useStore, useThree } from '../../core/hooks'
import { createLazyCreatorState, type CreatorState } from './ScopedStore'
import type { BufferLike, BufferRecord } from '#types'

//* Types ==============================

/**
 * A record of buffer-like values - allows mixed types (TypedArrays, BufferAttributes, TSL nodes)
 */
export type BufferRecordType<T extends BufferLike = BufferLike> = Record<string, T>

/**
 * Creator function that returns a record of buffers.
 * Receives CreatorState with access to existing buffers, gpuStorage, uniforms, nodes, etc.
 */
export type BufferCreator<T extends Record<string, BufferLike>> = (state: CreatorState) => T

/** Function signature for removeBuffers util */
export type RemoveBuffersFn = (names: string | string[], scope?: string) => void

/** Function signature for clearBuffers util */
export type ClearBuffersFn = (scope?: string) => void

/** Function signature for rebuildBuffers util */
export type RebuildBuffersFn = (scope?: string) => void

/** Function signature for disposeBuffers util - releases GPU resources */
export type DisposeBuffersFn = (names: string | string[], scope?: string) => void

/** Return type with utils included */
export type BuffersWithUtils<T extends Record<string, BufferLike> = Record<string, BufferLike>> = T & {
  removeBuffers: RemoveBuffersFn
  clearBuffers: ClearBuffersFn
  rebuildBuffers: RebuildBuffersFn
  disposeBuffers: DisposeBuffersFn
}

/**
 * Type guard to check if a value is a BufferLike vs a scope object.
 * Checks for TypedArrays, BufferAttributes, and TSL nodes.
 */
const isBufferLike = (value: unknown): value is BufferLike => {
  if (value === null || typeof value !== 'object') return false

  // TypedArrays
  if (ArrayBuffer.isView(value)) return true

  // Three.js BufferAttribute (has isBufferAttribute property)
  if ('isBufferAttribute' in value) return true

  // TSL nodes (have uuid or nodeType)
  if ('uuid' in value || 'nodeType' in value) return true

  return false
}

/**
 * Dispose a buffer-like value's GPU resources.
 * Handles TypedArrays (no-op), BufferAttributes, and TSL nodes.
 */
const disposeBuffer = (buffer: BufferLike): void => {
  if (buffer === null || typeof buffer !== 'object') return

  // Three.js objects with dispose method
  if ('dispose' in buffer && typeof buffer.dispose === 'function') {
    buffer.dispose()
  }
}

//* Hook Overloads ==============================

// Get all buffers (returns full structure with root buffers and scopes + utils)
export function useBuffers(): BuffersWithUtils<Record<string, BufferLike> & Record<string, Record<string, BufferLike>>>

// Get buffers from a specific scope (+ utils)
export function useBuffers(scope: string): BuffersWithUtils<Record<string, BufferLike>>

// Create/get buffers at root level (no scope) (+ utils)
export function useBuffers<T extends Record<string, BufferLike>>(creator: BufferCreator<T>): BuffersWithUtils<T>

// Create/get buffers within a scope (+ utils)
export function useBuffers<T extends Record<string, BufferLike>>(
  creator: BufferCreator<T>,
  scope: string,
): BuffersWithUtils<T>

//* Hook Implementation ==============================

/**
 * Hook for managing global TSL buffer storage with create-if-not-exists pattern.
 *
 * Buffers at root level are stored directly on state.buffers.
 * Scoped buffers are stored under state.buffers[scope].
 * Can store TypedArrays, BufferAttributes, and TSL buffer nodes (instancedArray, storage).
 *
 * @example
 * ```tsx
 * import { instancedArray, storage } from 'three/tsl'
 * import { StorageBufferAttribute } from 'three/webgpu'
 *
 * // Create root-level buffers (stored at state.buffers.positions, etc.)
 * const { positions, velocities } = useBuffers(() => ({
 *   positions: instancedArray(count, 'vec3'),
 *   velocities: new Float32Array(count * 3),
 * }))
 *
 * // Create scoped buffers (stored at state.buffers.particles.pos)
 * const { pos, vel } = useBuffers(() => ({
 *   pos: new StorageBufferAttribute(count, 4),
 *   vel: instancedArray(count, 'vec2'),
 * }), 'particles')
 *
 * // Access existing buffers from a specific scope
 * const particleBuffers = useBuffers('particles')
 *
 * // Get all buffers (root + scopes)
 * const allBuffers = useBuffers()
 *
 * // Use in compute shader or material
 * const posNode = buffers.particles.pos.element(instanceIndex)
 * ```
 */
export function useBuffers<T extends Record<string, BufferLike>>(
  creatorOrScope?: BufferCreator<T> | string,
  scope?: string,
):
  | BuffersWithUtils<T>
  | BuffersWithUtils<Record<string, BufferLike>>
  | BuffersWithUtils<Record<string, BufferLike> & Record<string, Record<string, BufferLike>>> {
  const store = useStore()

  //* Utils ==============================
  // Memoized util functions that capture store reference

  /** Remove buffers by name from root or a scope */
  const removeBuffers = useCallback<RemoveBuffersFn>(
    (names, targetScope) => {
      const nameArray = Array.isArray(names) ? names : [names]
      store.setState((state) => {
        if (targetScope) {
          // Remove from scoped buffers
          const currentScope = { ...(state.buffers[targetScope] as BufferRecord) }
          for (const name of nameArray) delete currentScope[name]
          return { buffers: { ...state.buffers, [targetScope]: currentScope } }
        }
        // Remove from root level
        const buffers = { ...state.buffers }
        for (const name of nameArray) if (isBufferLike(buffers[name])) delete buffers[name]
        return { buffers }
      })
    },
    [store],
  )

  /** Clear buffers - scope name, 'root' for root only, or undefined for all */
  const clearBuffers = useCallback<ClearBuffersFn>(
    (targetScope) => {
      store.setState((state) => {
        // Clear specific scope
        if (targetScope && targetScope !== 'root') {
          const { [targetScope]: _, ...rest } = state.buffers
          return { buffers: rest }
        }
        // Clear root only (preserve scopes)
        if (targetScope === 'root') {
          const buffers: typeof state.buffers = {}
          for (const [key, value] of Object.entries(state.buffers)) {
            if (!isBufferLike(value)) buffers[key] = value
          }
          return { buffers }
        }
        // Clear everything
        return { buffers: {} }
      })
    },
    [store],
  )

  /** Rebuild buffers - clears cache and increments HMR version to trigger re-creation */
  const rebuildBuffers = useCallback<RebuildBuffersFn>(
    (targetScope) => {
      store.setState((state) => {
        // Clear the specified scope (or all) and bump version
        let newBuffers = state.buffers
        if (targetScope && targetScope !== 'root') {
          const { [targetScope]: _, ...rest } = state.buffers
          newBuffers = rest
        } else if (targetScope === 'root') {
          newBuffers = {}
          for (const [key, value] of Object.entries(state.buffers)) {
            if (!isBufferLike(value)) newBuffers[key] = value
          }
        } else {
          newBuffers = {}
        }
        return { buffers: newBuffers, _hmrVersion: state._hmrVersion + 1 }
      })
    },
    [store],
  )

  /** Dispose buffers - releases GPU resources and removes from store */
  const disposeBuffers = useCallback<DisposeBuffersFn>(
    (names, targetScope) => {
      const nameArray = Array.isArray(names) ? names : [names]
      const state = store.getState()

      // Dispose each buffer
      for (const name of nameArray) {
        const buffer = targetScope
          ? (state.buffers[targetScope] as BufferRecord)?.[name]
          : (state.buffers[name] as BufferLike)

        if (buffer && isBufferLike(buffer)) {
          disposeBuffer(buffer)
        }
      }

      // Then remove from store
      removeBuffers(names, targetScope)
    },
    [store, removeBuffers],
  )

  //* Main Logic ==============================

  // Determine if we're in reader mode (no creator function)
  const isReader = creatorOrScope === undefined || typeof creatorOrScope === 'string'

  // Subscribe to buffers changes for reader modes
  // This ensures useBuffers() and useBuffers('scope') reactively update when store changes
  // For creator mode, we intentionally don't use this value to avoid re-running the creator
  const storeBuffers = useThree((s) => s.buffers)

  // Subscribe to HMR version for creator modes
  // This allows rebuildBuffers() to bust the memoization cache and force re-creation
  const hmrVersion = useThree((s) => s._hmrVersion)

  // Extracted deps to avoid complex expressions in useMemo dependency array
  const scopeDep = typeof creatorOrScope === 'string' ? creatorOrScope : scope
  const readerDep = isReader ? storeBuffers : null
  const creatorDep = isReader ? null : hmrVersion

  const buffers = useMemo(() => {
    // Case 1: No arguments - return all buffers (root + scopes)
    // Uses subscribed storeBuffers for reactivity
    if (creatorOrScope === undefined) {
      return storeBuffers as BufferRecordType & Record<string, BufferRecordType>
    }

    // Case 2: String argument - return buffers from that scope
    // Uses subscribed storeBuffers for reactivity
    if (typeof creatorOrScope === 'string') {
      const scopeData = storeBuffers[creatorOrScope]
      // Make sure we're returning a scope object, not a buffer
      if (scopeData && !isBufferLike(scopeData)) return scopeData as BufferRecordType
      return {}
    }

    // Case 3: Creator function - create if not exists
    // Uses store.getState() snapshot to avoid re-running creator on unrelated buffer changes
    const state = store.getState()
    const set = store.setState
    const creator = creatorOrScope

    // Lazy ScopedStore wrapping - Proxies only created if uniforms/nodes/buffers accessed
    const wrappedState = createLazyCreatorState(state)
    const created = creator(wrappedState)
    const result: Record<string, BufferLike> = {}
    let hasNewBuffers = false

    // Scoped buffers ---------------------------------
    if (scope) {
      const currentScope = (state.buffers[scope] as BufferRecord) ?? {}

      for (const [name, buffer] of Object.entries(created)) {
        if (currentScope[name]) {
          result[name] = currentScope[name]
        } else {
          // Apply label for debugging if it's a TSL node
          if ('setName' in buffer && typeof buffer.setName === 'function') {
            buffer.setName(`${scope}.${name}`)
          }
          result[name] = buffer
          hasNewBuffers = true
        }
      }

      if (hasNewBuffers) {
        set((s) => ({
          buffers: {
            ...s.buffers,
            [scope]: { ...(s.buffers[scope] as BufferRecord), ...result },
          },
        }))
      }

      return result as T
    }

    // Root-level buffers ---------------------------------
    for (const [name, buffer] of Object.entries(created)) {
      const existing = state.buffers[name]
      if (existing && isBufferLike(existing)) {
        result[name] = existing
      } else {
        // Apply label for debugging if it's a TSL node
        if ('setName' in buffer && typeof buffer.setName === 'function') {
          buffer.setName(name)
        }
        result[name] = buffer
        hasNewBuffers = true
      }
    }

    if (hasNewBuffers) {
      set((s) => ({ buffers: { ...s.buffers, ...result } }))
    }

    return result as T
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, scopeDep, readerDep, creatorDep])

  // Return buffers with utils
  return { ...buffers, removeBuffers, clearBuffers, rebuildBuffers, disposeBuffers } as BuffersWithUtils<T>
}

//* Standalone rebuildBuffers ==============================
// Global function for HMR integration - can be called from Canvas or module-level code

/**
 * Global rebuildBuffers function for HMR integration.
 * Clears cached buffers and increments _hmrVersion to trigger re-creation.
 * Call this when HMR is detected to refresh all buffer creators.
 *
 * @param store - The R3F store (from useStore or context)
 * @param scope - Optional scope to rebuild ('root' for root only, string for specific scope, undefined for all)
 */
export function rebuildAllBuffers(store: ReturnType<typeof useStore>, scope?: string) {
  store.setState((state) => {
    let newBuffers = state.buffers
    if (scope && scope !== 'root') {
      const { [scope]: _, ...rest } = state.buffers
      newBuffers = rest
    } else if (scope === 'root') {
      newBuffers = {}
      for (const [key, value] of Object.entries(state.buffers)) {
        if (!isBufferLike(value)) newBuffers[key] = value
      }
    } else {
      newBuffers = {}
    }
    return { buffers: newBuffers, _hmrVersion: state._hmrVersion + 1 }
  })
}

export default useBuffers
