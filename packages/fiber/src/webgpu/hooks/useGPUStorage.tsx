import { useCallback, useMemo } from 'react'
import { useStore, useThree } from '../../core/hooks'
import { createLazyCreatorState, type CreatorState } from './ScopedStore'
import type { StorageLike, StorageRecord } from '#types'

//* Types ==============================

/**
 * A record of storage-like values - allows mixed types (StorageTexture, Storage3DTexture, TSL nodes)
 */
export type StorageRecordType<T extends StorageLike = StorageLike> = Record<string, T>

/**
 * Creator function that returns a record of GPU storage objects.
 * Receives CreatorState with access to existing buffers, gpuStorage, uniforms, nodes, etc.
 */
export type StorageCreator<T extends Record<string, StorageLike>> = (state: CreatorState) => T

/** Function signature for removeStorage util */
export type RemoveStorageFn = (names: string | string[], scope?: string) => void

/** Function signature for clearStorage util */
export type ClearStorageFn = (scope?: string) => void

/** Function signature for rebuildStorage util */
export type RebuildStorageFn = (scope?: string) => void

/** Function signature for disposeStorage util - releases GPU resources */
export type DisposeStorageFn = (names: string | string[], scope?: string) => void

/** Return type with utils included */
export type StorageWithUtils<T extends Record<string, StorageLike> = Record<string, StorageLike>> = T & {
  removeStorage: RemoveStorageFn
  clearStorage: ClearStorageFn
  rebuildStorage: RebuildStorageFn
  disposeStorage: DisposeStorageFn
}

/**
 * Type guard to check if a value is a StorageLike vs a scope object.
 * Checks for StorageTexture, Data3DTexture, and TSL nodes.
 */
const isStorageLike = (value: unknown): value is StorageLike => {
  if (value === null || typeof value !== 'object') return false

  // Three.js storage textures (have isTexture and isStorageTexture properties)
  if ('isTexture' in value) return true

  // Three.js Data3DTexture (has isData3DTexture property)
  if ('isData3DTexture' in value) return true

  // TSL nodes (have uuid or nodeType)
  if ('uuid' in value || 'nodeType' in value) return true

  return false
}

/**
 * Dispose a storage-like value's GPU resources.
 * Handles textures and TSL nodes.
 */
const disposeStorage = (storage: StorageLike): void => {
  if (storage === null || typeof storage !== 'object') return

  // Three.js objects with dispose method
  if ('dispose' in storage && typeof storage.dispose === 'function') {
    storage.dispose()
  }
}

//* Hook Overloads ==============================

// Get all storage (returns full structure with root storage and scopes + utils)
export function useGPUStorage(): StorageWithUtils<
  Record<string, StorageLike> & Record<string, Record<string, StorageLike>>
>

// Get storage from a specific scope (+ utils)
export function useGPUStorage(scope: string): StorageWithUtils<Record<string, StorageLike>>

// Create/get storage at root level (no scope) (+ utils)
export function useGPUStorage<T extends Record<string, StorageLike>>(creator: StorageCreator<T>): StorageWithUtils<T>

// Create/get storage within a scope (+ utils)
export function useGPUStorage<T extends Record<string, StorageLike>>(
  creator: StorageCreator<T>,
  scope: string,
): StorageWithUtils<T>

//* Hook Implementation ==============================

/**
 * Hook for managing global GPU storage (textures) with create-if-not-exists pattern.
 *
 * Storage at root level is stored directly on state.gpuStorage.
 * Scoped storage is stored under state.gpuStorage[scope].
 * Can store StorageTexture, Storage3DTexture, and TSL storage texture nodes.
 *
 * @example
 * ```tsx
 * import { StorageTexture, Storage3DTexture } from 'three/webgpu'
 * import { storageTexture, textureStore } from 'three/tsl'
 *
 * // Create root-level storage (stored at state.gpuStorage.heightMap, etc.)
 * const { heightMap, voxelData } = useGPUStorage(() => ({
 *   heightMap: new StorageTexture(512, 512),
 *   voxelData: new Storage3DTexture(64, 64, 64),
 * }))
 *
 * // Create scoped storage (stored at state.gpuStorage.terrain.normal)
 * const { normal, albedo } = useGPUStorage(() => ({
 *   normal: new StorageTexture(1024, 1024),
 *   albedo: new StorageTexture(1024, 1024),
 * }), 'terrain')
 *
 * // Access existing storage from a specific scope
 * const terrainStorage = useGPUStorage('terrain')
 *
 * // Get all storage (root + scopes)
 * const allStorage = useGPUStorage()
 *
 * // Use in compute shader or material
 * const heightNode = texture(gpuStorage.terrain.heightMap)
 * ```
 */
export function useGPUStorage<T extends Record<string, StorageLike>>(
  creatorOrScope?: StorageCreator<T> | string,
  scope?: string,
):
  | StorageWithUtils<T>
  | StorageWithUtils<Record<string, StorageLike>>
  | StorageWithUtils<Record<string, StorageLike> & Record<string, Record<string, StorageLike>>> {
  const store = useStore()

  //* Utils ==============================
  // Memoized util functions that capture store reference

  /** Remove storage by name from root or a scope */
  const removeStorage = useCallback<RemoveStorageFn>(
    (names, targetScope) => {
      const nameArray = Array.isArray(names) ? names : [names]
      store.setState((state) => {
        if (targetScope) {
          // Remove from scoped storage
          const currentScope = { ...(state.gpuStorage[targetScope] as StorageRecord) }
          for (const name of nameArray) delete currentScope[name]
          return { gpuStorage: { ...state.gpuStorage, [targetScope]: currentScope } }
        }
        // Remove from root level
        const gpuStorage = { ...state.gpuStorage }
        for (const name of nameArray) if (isStorageLike(gpuStorage[name])) delete gpuStorage[name]
        return { gpuStorage }
      })
    },
    [store],
  )

  /** Clear storage - scope name, 'root' for root only, or undefined for all */
  const clearStorage = useCallback<ClearStorageFn>(
    (targetScope) => {
      store.setState((state) => {
        // Clear specific scope
        if (targetScope && targetScope !== 'root') {
          const { [targetScope]: _, ...rest } = state.gpuStorage
          return { gpuStorage: rest }
        }
        // Clear root only (preserve scopes)
        if (targetScope === 'root') {
          const gpuStorage: typeof state.gpuStorage = {}
          for (const [key, value] of Object.entries(state.gpuStorage)) {
            if (!isStorageLike(value)) gpuStorage[key] = value
          }
          return { gpuStorage }
        }
        // Clear everything
        return { gpuStorage: {} }
      })
    },
    [store],
  )

  /** Rebuild storage - clears cache and increments HMR version to trigger re-creation */
  const rebuildStorage = useCallback<RebuildStorageFn>(
    (targetScope) => {
      store.setState((state) => {
        // Clear the specified scope (or all) and bump version
        let newStorage = state.gpuStorage
        if (targetScope && targetScope !== 'root') {
          const { [targetScope]: _, ...rest } = state.gpuStorage
          newStorage = rest
        } else if (targetScope === 'root') {
          newStorage = {}
          for (const [key, value] of Object.entries(state.gpuStorage)) {
            if (!isStorageLike(value)) newStorage[key] = value
          }
        } else {
          newStorage = {}
        }
        return { gpuStorage: newStorage, _hmrVersion: state._hmrVersion + 1 }
      })
    },
    [store],
  )

  /** Dispose storage - releases GPU resources and removes from store */
  const disposeStorageFn = useCallback<DisposeStorageFn>(
    (names, targetScope) => {
      const nameArray = Array.isArray(names) ? names : [names]
      const state = store.getState()

      // Dispose each storage item
      for (const name of nameArray) {
        const storage = targetScope
          ? (state.gpuStorage[targetScope] as StorageRecord)?.[name]
          : (state.gpuStorage[name] as StorageLike)

        if (storage && isStorageLike(storage)) {
          disposeStorage(storage)
        }
      }

      // Then remove from store
      removeStorage(names, targetScope)
    },
    [store, removeStorage],
  )

  //* Main Logic ==============================

  // Determine if we're in reader mode (no creator function)
  const isReader = creatorOrScope === undefined || typeof creatorOrScope === 'string'

  // Subscribe to gpuStorage changes for reader modes
  // This ensures useGPUStorage() and useGPUStorage('scope') reactively update when store changes
  // For creator mode, we intentionally don't use this value to avoid re-running the creator
  const storeStorage = useThree((s) => s.gpuStorage)

  // Subscribe to HMR version for creator modes
  // This allows rebuildStorage() to bust the memoization cache and force re-creation
  const hmrVersion = useThree((s) => s._hmrVersion)

  // Extracted deps to avoid complex expressions in useMemo dependency array
  const scopeDep = typeof creatorOrScope === 'string' ? creatorOrScope : scope
  const readerDep = isReader ? storeStorage : null
  const creatorDep = isReader ? null : hmrVersion

  const gpuStorage = useMemo(() => {
    // Case 1: No arguments - return all storage (root + scopes)
    // Uses subscribed storeStorage for reactivity
    if (creatorOrScope === undefined) {
      return storeStorage as StorageRecordType & Record<string, StorageRecordType>
    }

    // Case 2: String argument - return storage from that scope
    // Uses subscribed storeStorage for reactivity
    if (typeof creatorOrScope === 'string') {
      const scopeData = storeStorage[creatorOrScope]
      // Make sure we're returning a scope object, not a storage item
      if (scopeData && !isStorageLike(scopeData)) return scopeData as StorageRecordType
      return {}
    }

    // Case 3: Creator function - create if not exists
    // Uses store.getState() snapshot to avoid re-running creator on unrelated storage changes
    const state = store.getState()
    const set = store.setState
    const creator = creatorOrScope

    // Lazy ScopedStore wrapping - Proxies only created if uniforms/nodes/buffers/storage accessed
    const wrappedState = createLazyCreatorState(state)
    const created = creator(wrappedState)
    const result: Record<string, StorageLike> = {}
    let hasNewStorage = false

    // Scoped storage ---------------------------------
    if (scope) {
      const currentScope = (state.gpuStorage[scope] as StorageRecord) ?? {}

      for (const [name, storage] of Object.entries(created)) {
        if (currentScope[name]) {
          result[name] = currentScope[name]
        } else {
          // Apply label for debugging if it's a TSL node
          if ('setName' in storage && typeof storage.setName === 'function') {
            storage.setName(`${scope}.${name}`)
          }
          // Apply name to textures if they have a name property
          if ('name' in storage && typeof storage.name === 'string') {
            ;(storage as any).name = `${scope}.${name}`
          }
          result[name] = storage
          hasNewStorage = true
        }
      }

      if (hasNewStorage) {
        set((s) => ({
          gpuStorage: {
            ...s.gpuStorage,
            [scope]: { ...(s.gpuStorage[scope] as StorageRecord), ...result },
          },
        }))
      }

      return result as T
    }

    // Root-level storage ---------------------------------
    for (const [name, storage] of Object.entries(created)) {
      const existing = state.gpuStorage[name]
      if (existing && isStorageLike(existing)) {
        result[name] = existing
      } else {
        // Apply label for debugging if it's a TSL node
        if ('setName' in storage && typeof storage.setName === 'function') {
          storage.setName(name)
        }
        // Apply name to textures if they have a name property
        if ('name' in storage && typeof storage.name === 'string') {
          ;(storage as any).name = name
        }
        result[name] = storage
        hasNewStorage = true
      }
    }

    if (hasNewStorage) {
      set((s) => ({ gpuStorage: { ...s.gpuStorage, ...result } }))
    }

    return result as T
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, scopeDep, readerDep, creatorDep])

  // Return storage with utils
  return {
    ...gpuStorage,
    removeStorage,
    clearStorage,
    rebuildStorage,
    disposeStorage: disposeStorageFn,
  } as StorageWithUtils<T>
}

//* Standalone rebuildStorage ==============================
// Global function for HMR integration - can be called from Canvas or module-level code

/**
 * Global rebuildStorage function for HMR integration.
 * Clears cached storage and increments _hmrVersion to trigger re-creation.
 * Call this when HMR is detected to refresh all storage creators.
 *
 * @param store - The R3F store (from useStore or context)
 * @param scope - Optional scope to rebuild ('root' for root only, string for specific scope, undefined for all)
 */
export function rebuildAllStorage(store: ReturnType<typeof useStore>, scope?: string) {
  store.setState((state) => {
    let newStorage = state.gpuStorage
    if (scope && scope !== 'root') {
      const { [scope]: _, ...rest } = state.gpuStorage
      newStorage = rest
    } else if (scope === 'root') {
      newStorage = {}
      for (const [key, value] of Object.entries(state.gpuStorage)) {
        if (!isStorageLike(value)) newStorage[key] = value
      }
    } else {
      newStorage = {}
    }
    return { gpuStorage: newStorage, _hmrVersion: state._hmrVersion + 1 }
  })
}

export default useGPUStorage
