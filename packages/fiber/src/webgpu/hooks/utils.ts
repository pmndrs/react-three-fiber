import type { StoreApi } from 'zustand'
import type { RootState } from '../../core/store'

//* Map Utilities for Textures ==============================
// Textures use Map<string, T> since URLs work better as Map keys

/**
 * Add a single texture to the Map
 */
export function addTexture(set: StoreApi<RootState>['setState'], key: string, value: any) {
  set((state) => {
    const newMap = new Map(state.textures)
    newMap.set(key, value)
    return { textures: newMap }
  })
}

/**
 * Add multiple textures to the Map
 */
export function addTextures(set: StoreApi<RootState>['setState'], items: Map<string, any> | Record<string, any>) {
  set((state) => {
    const newMap = new Map(state.textures)
    const entries = items instanceof Map ? items.entries() : Object.entries(items)
    for (const [key, value] of entries) {
      newMap.set(key, value)
    }
    return { textures: newMap }
  })
}

/**
 * Remove a single texture from the Map
 */
export function removeTexture(set: StoreApi<RootState>['setState'], key: string) {
  set((state) => {
    const newMap = new Map(state.textures)
    newMap.delete(key)
    return { textures: newMap }
  })
}

/**
 * Remove multiple textures from the Map
 */
export function removeTextures(set: StoreApi<RootState>['setState'], keys: string[]) {
  set((state) => {
    const newMap = new Map(state.textures)
    for (const key of keys) newMap.delete(key)
    return { textures: newMap }
  })
}

//* Texture Operations Interface ==============================

export interface TextureOperations {
  add: (key: string, value: any) => void
  addMultiple: (items: Map<string, any> | Record<string, any>) => void
  remove: (key: string) => void
  removeMultiple: (keys: string[]) => void
}

export function createTextureOperations(set: StoreApi<RootState>['setState']): TextureOperations {
  return {
    add: (key, value) => addTexture(set, key, value),
    addMultiple: (items) => addTextures(set, items),
    remove: (key) => removeTexture(set, key),
    removeMultiple: (keys) => removeTextures(set, keys),
  }
}
