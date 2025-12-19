//* Not sure we will use this hook just yet.
import { useMemo } from 'react'
import { useStore } from './'
import { Texture as _Texture } from '#three'

//* Types ==============================

export type TextureEntry = _Texture | { value: _Texture; [key: string]: any }

export interface UseTexturesReturn {
  /** Map of all textures currently in cache */
  textures: Map<string, TextureEntry>

  // Read --
  /** Get a specific texture by key (usually URL) */
  get: (key: string) => TextureEntry | undefined
  /** Check if a texture exists in cache */
  has: (key: string) => boolean

  // Write --
  /** Add a texture to the cache */
  add: (key: string, value: TextureEntry) => void
  /** Add multiple textures to the cache */
  addMultiple: (items: Map<string, TextureEntry> | Record<string, TextureEntry>) => void

  // Remove (cache only) --
  /** Remove a texture from cache (does NOT dispose GPU resources) */
  remove: (key: string) => void
  /** Remove multiple textures from cache */
  removeMultiple: (keys: string[]) => void

  // Dispose (GPU cleanup + remove) --
  /** Dispose a texture's GPU resources and remove from cache */
  dispose: (key: string) => void
  /** Dispose multiple textures */
  disposeMultiple: (keys: string[]) => void
  /** Dispose ALL cached textures - use with caution */
  disposeAll: () => void
}

//* Texture Operations ==============================

/** Extract the actual Three.js Texture from an entry (handles both raw textures and TSL nodes) */
function getTextureValue(entry: TextureEntry): _Texture | null {
  if (entry instanceof _Texture) return entry
  if (entry && typeof entry === 'object' && 'value' in entry && entry.value instanceof _Texture) {
    return entry.value
  }
  return null
}

//* Hook ==============================

/**
 * Hook for managing the global texture cache in R3F state.
 *
 * Textures are stored in a Map with URL/path keys for efficient lookup.
 * Useful for sharing texture references across materials and components.
 *
 * @example
 * ```tsx
 * const { textures, add, get, remove, has, dispose } = useTextures()
 *
 * // Check if texture is already cached
 * if (!has('/textures/diffuse.png')) {
 *   // Load with useTexture and cache: true, or manually add
 *   const tex = useTexture('/textures/diffuse.png', { cache: true })
 * }
 *
 * // Access cached texture from anywhere
 * const diffuse = get('/textures/diffuse.png')
 * if (diffuse) material.map = diffuse
 *
 * // Remove from cache only (texture still in GPU memory)
 * remove('/textures/old.png')
 *
 * // Fully dispose (frees GPU memory + removes from cache)
 * dispose('/textures/unused.png')
 *
 * // Nuclear option - dispose everything
 * disposeAll()
 * ```
 */
export function useTextures(): UseTexturesReturn {
  const store = useStore()

  return useMemo(() => {
    const set = store.setState
    const getState = store.getState

    //* Add Operations --

    const add = (key: string, value: TextureEntry) => {
      set((state) => {
        const newMap = new Map(state.textures)
        newMap.set(key, value)
        return { textures: newMap }
      })
    }

    const addMultiple = (items: Map<string, TextureEntry> | Record<string, TextureEntry>) => {
      set((state) => {
        const newMap = new Map(state.textures)
        const entries = items instanceof Map ? items.entries() : Object.entries(items)
        for (const [key, value] of entries) {
          newMap.set(key, value)
        }
        return { textures: newMap }
      })
    }

    //* Remove Operations (cache only) --

    const remove = (key: string) => {
      set((state) => {
        const newMap = new Map(state.textures)
        newMap.delete(key)
        return { textures: newMap }
      })
    }

    const removeMultiple = (keys: string[]) => {
      set((state) => {
        const newMap = new Map(state.textures)
        for (const key of keys) newMap.delete(key)
        return { textures: newMap }
      })
    }

    //* Dispose Operations (GPU cleanup + remove) --

    const dispose = (key: string) => {
      const entry = getState().textures.get(key)
      if (entry) {
        const tex = getTextureValue(entry)
        tex?.dispose()
      }
      remove(key)
    }

    const disposeMultiple = (keys: string[]) => {
      const textures = getState().textures
      for (const key of keys) {
        const entry = textures.get(key)
        if (entry) {
          const tex = getTextureValue(entry)
          tex?.dispose()
        }
      }
      removeMultiple(keys)
    }

    const disposeAll = () => {
      const textures = getState().textures
      for (const entry of textures.values()) {
        const tex = getTextureValue(entry)
        tex?.dispose()
      }
      set({ textures: new Map() })
    }

    return {
      // Getter for the textures Map (reactive via getState)
      get textures() {
        return getState().textures
      },

      // Read
      get: (key: string) => getState().textures.get(key),
      has: (key: string) => getState().textures.has(key),

      // Write
      add,
      addMultiple,

      // Remove (cache only)
      remove,
      removeMultiple,

      // Dispose (GPU + cache)
      dispose,
      disposeMultiple,
      disposeAll,
    }
  }, [store])
}

export default useTextures
