// Migrated from Drei
import { Texture as _Texture, TextureLoader } from '#three'
import { useLoader, useThree, useStore } from './'
import { useLayoutEffect, useEffect, useMemo, ReactNode } from 'react'

//* Types ==============================

export const IsObject = (url: unknown): url is Record<string, string> =>
  url === Object(url) && !Array.isArray(url) && typeof url !== 'function'

type TextureArray<T> = T extends string[] ? _Texture[] : never
type TextureRecord<T> = T extends Record<string, string> ? { [key in keyof T]: _Texture } : never
type SingleTexture<T> = T extends string ? _Texture : never

export type MappedTextureType<T extends string[] | string | Record<string, string>> =
  | TextureArray<T>
  | TextureRecord<T>
  | SingleTexture<T>

/** Options for useTexture hook */
export type UseTextureOptions<Url extends string[] | string | Record<string, string>> = {
  /** Callback when texture(s) finish loading */
  onLoad?: (texture: MappedTextureType<Url>) => void
  /**
   * Cache the texture in R3F's global state for access via useTextures().
   * When true:
   * - Textures persist until explicitly disposed
   * - Returns existing cached textures if available (preserving modifications like colorSpace)
   * @default false
   */
  cache?: boolean
}

//* Helpers ==============================

/** Get array of URLs from any input format */
function getUrls(input: string | string[] | Record<string, string>): string[] {
  if (typeof input === 'string') return [input]
  if (Array.isArray(input)) return input
  return Object.values(input)
}

/** Check if all URLs exist in the texture cache */
function allUrlsCached(urls: string[], textureCache: Map<string, any>): boolean {
  return urls.every((url) => textureCache.has(url))
}

/** Build result from cache based on input format */
function buildFromCache<Url extends string[] | string | Record<string, string>>(
  input: Url,
  textureCache: Map<string, any>,
): MappedTextureType<Url> {
  if (typeof input === 'string') {
    return textureCache.get(input) as MappedTextureType<Url>
  } else if (Array.isArray(input)) {
    return input.map((url) => textureCache.get(url)) as MappedTextureType<Url>
  } else {
    // Object input - map keys to cached textures
    const result = {} as Record<string, _Texture>
    const objInput = input as Record<string, string>
    for (const key in objInput) {
      result[key] = textureCache.get(objInput[key]) as _Texture
    }
    return result as MappedTextureType<Url>
  }
}

//* Hook ==============================

/**
 * Load texture(s) using Three's TextureLoader with Suspense support.
 *
 * @param input - URL string, array of URLs, or object mapping keys to URLs
 * @param optionsOrOnLoad - Options object or legacy onLoad callback
 *
 * @example
 * ```tsx
 * // Single texture
 * const diffuse = useTexture('/textures/diffuse.png')
 *
 * // Multiple textures (array)
 * const [diffuse, normal] = useTexture(['/diffuse.png', '/normal.png'])
 *
 * // Named textures (object)
 * const { diffuse, normal } = useTexture({
 *   diffuse: '/diffuse.png',
 *   normal: '/normal.png'
 * })
 *
 * // With caching - returns same texture object across components
 * // Modifications (colorSpace, wrapS, etc.) are preserved
 * const diffuse = useTexture('/diffuse.png', { cache: true })
 * diffuse.colorSpace = THREE.SRGBColorSpace
 *
 * // Another component gets the SAME texture with colorSpace already set
 * const sameDiffuse = useTexture('/diffuse.png', { cache: true })
 *
 * // Access cache directly
 * const { get } = useTextures()
 * const cached = get('/diffuse.png')
 * ```
 */
export function useTexture<Url extends string[] | string | Record<string, string>>(
  input: Url,
  optionsOrOnLoad?: UseTextureOptions<Url> | ((texture: MappedTextureType<Url>) => void),
): MappedTextureType<Url> {
  const renderer = useThree((state) => state.internal.actualRenderer)
  const store = useStore()

  // Subscribe to texture cache changes (for reactivity when cache updates)
  const textureCache = useThree((state) => state.textures)

  // Normalize options - support both legacy callback and options object
  const options: UseTextureOptions<Url> =
    typeof optionsOrOnLoad === 'function' ? { onLoad: optionsOrOnLoad } : optionsOrOnLoad ?? {}

  const { onLoad, cache = false } = options

  //* Check our cache first when cache is enabled --
  // If all requested textures are in our cache, use those (preserves modifications)
  const urls = useMemo(() => getUrls(input), [input])

  const cachedResult = useMemo(() => {
    if (!cache) return null
    if (!allUrlsCached(urls, textureCache)) return null
    return buildFromCache(input, textureCache)
  }, [cache, urls, textureCache, input])

  //* Load via useLoader (handles suspense) --
  // This always runs to maintain hooks order, but we may not use the result
  const loadedTextures = useLoader(
    TextureLoader,
    IsObject(input) ? Object.values(input) : input,
  ) as MappedTextureType<Url>

  // Call onLoad when textures are ready (only on initial load, not cache hits)
  useLayoutEffect(() => {
    if (!cachedResult) onLoad?.(loadedTextures)
  }, [onLoad, cachedResult, loadedTextures])

  // https://github.com/mrdoob/three.js/issues/22696
  // Upload the texture to the GPU immediately instead of waiting for the first render
  // NOTE: only available for WebGLRenderer
  useEffect(() => {
    // Skip if using cached textures (already initialized)
    if (cachedResult) return

    if ('initTexture' in renderer) {
      let textureArray: _Texture[] = []
      if (Array.isArray(loadedTextures)) {
        textureArray = loadedTextures
      } else if (loadedTextures instanceof _Texture) {
        textureArray = [loadedTextures]
      } else if (IsObject(loadedTextures)) {
        textureArray = Object.values(loadedTextures)
      }

      textureArray.forEach((texture) => {
        if (texture instanceof _Texture) {
          renderer.initTexture(texture)
        }
      })
    }
  }, [renderer, loadedTextures, cachedResult])

  // Map textures to keys if object input was provided
  const mappedTextures = useMemo(() => {
    // If we have cached result, it's already in the right format
    if (cachedResult) return cachedResult

    if (IsObject(input)) {
      const keyed = {} as Record<string, _Texture>
      const textureArray = loadedTextures as _Texture[]
      let i = 0
      for (const key in input) keyed[key] = textureArray[i++]
      return keyed as TextureRecord<Url>
    } else {
      return loadedTextures
    }
  }, [input, loadedTextures, cachedResult])

  //* Add to cache if requested and not already cached --
  useEffect(() => {
    if (!cache) return
    // Don't re-cache if we got the result from cache
    if (cachedResult) return

    const set = store.setState

    // Build URL to texture mapping
    const urlTextureMap: Array<[string, _Texture]> = []

    if (typeof input === 'string') {
      urlTextureMap.push([input, mappedTextures as _Texture])
    } else if (Array.isArray(input)) {
      const textureArray = mappedTextures as _Texture[]
      input.forEach((url, i) => urlTextureMap.push([url, textureArray[i]]))
    } else if (IsObject(input)) {
      const textureRecord = mappedTextures as Record<string, _Texture>
      for (const key in input) {
        const url = input[key]
        urlTextureMap.push([url, textureRecord[key]])
      }
    }

    // Add to cache (only if not already present)
    set((state) => {
      const newMap = new Map(state.textures)
      let changed = false
      for (const [url, texture] of urlTextureMap) {
        if (!newMap.has(url)) {
          newMap.set(url, texture)
          changed = true
        }
      }
      return changed ? { textures: newMap } : state
    })

    // No cleanup on unmount - textures persist until explicit dispose
  }, [cache, input, mappedTextures, store, cachedResult])

  return mappedTextures
}

//* Static Methods ==============================

useTexture.preload = (url: string | string[]) => useLoader.preload(TextureLoader, url)
useTexture.clear = (input: string | string[]) => useLoader.clear(TextureLoader, input)

//* Component Wrapper ==============================

export const Texture = ({
  children,
  input,
  onLoad,
  cache,
}: {
  children?: (texture: ReturnType<typeof useTexture>) => ReactNode
  input: Parameters<typeof useTexture>[0]
  onLoad?: Parameters<typeof useTexture>[1]
  cache?: boolean
}) => {
  // Normalize to options object
  const options = typeof onLoad === 'function' ? { onLoad, cache } : { ...onLoad, cache }
  const ret = useTexture(input, options)

  return <>{children?.(ret)}</>
}
