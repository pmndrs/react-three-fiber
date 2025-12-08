import { useMemo } from 'react'
import { useStore } from '../../core/hooks'
import { createTextureOperations, type TextureOperations } from './utils'

//* Types ==============================

export type TextureNode = {
  value: any // The underlying Three.js Texture
  // TSL texture nodes have additional properties for sampling, UV, etc.
  [key: string]: any
}

export interface UseTexturesReturn extends TextureOperations {
  /** Map of all textures currently in state */
  textures: Map<string, TextureNode>
  /** Get a specific texture by key (usually URL) */
  get: (key: string) => TextureNode | undefined
  /** Check if a texture exists */
  has: (key: string) => boolean
}

//* Hook ==============================

/**
 * Hook for managing global TSL texture nodes in the R3F state.
 *
 * Textures use a Map with URL/path keys for efficient lookup of loaded textures.
 * Useful for sharing texture references across materials and shaders.
 *
 * @example
 * ```tsx
 * import { texture } from 'three/tsl'
 * import { useLoader } from '@react-three/fiber'
 * import { TextureLoader } from 'three'
 *
 * const { textures, add, get, remove, has } = useTextures()
 *
 * // Load and store as TSL texture node
 * const diffuseMap = useLoader(TextureLoader, '/textures/diffuse.png')
 * const diffuseNode = texture(diffuseMap)
 * add('/textures/diffuse.png', diffuseNode)
 *
 * // Access from another component by URL
 * const diffuse = get('/textures/diffuse.png')
 * if (diffuse) material.colorNode = diffuse
 *
 * // Check existence before loading
 * if (!has('/textures/normal.png')) {
 *   // Load and add...
 * }
 *
 * // Add multiple
 * addMultiple({
 *   '/textures/albedo.png': texture(albedoMap),
 *   '/textures/roughness.png': texture(roughnessMap),
 * })
 *
 * // Cleanup
 * remove('/textures/diffuse.png')
 * ```
 */
export function useTextures(): UseTexturesReturn {
  const store = useStore()

  return useMemo(() => {
    const set = store.setState
    const getState = store.getState

    // Get the texture operations
    const ops = createTextureOperations(set)

    return {
      ...ops,

      // Getter for the textures Map
      get textures() {
        return getState().textures
      },

      // Get a specific texture by key
      get: (key: string) => getState().textures.get(key),

      // Check if texture exists
      has: (key: string) => getState().textures.has(key),
    }
  }, [store])
}

export default useTextures
