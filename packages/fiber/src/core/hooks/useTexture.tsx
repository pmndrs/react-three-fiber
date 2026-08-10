// Migrated from Drei
import { Texture as _Texture, TextureLoader } from '#three'
import { useLoader, useThree, useStore } from './'
import { useLayoutEffect, useEffect, useMemo, useRef, ReactNode } from 'react'

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
   * Register the texture(s) in R3F's global texture registry for access via useTextures().
   * When true (the default):
   * - Textures persist until explicitly disposed
   * - On mount, returns existing registered textures if available (preserving modifications like colorSpace)
   *
   * Reads are taken once at mount — a mounted `useTexture` does not re-render when the registry
   * changes. To react to registry swaps, use `useTextures(s => s.get(key))` instead.
   *
   * Pass `false` to opt out of registry enrollment entirely.
   * @default true
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

/**
 * A value-equal signature for any input form, used to key memos off the input's *contents*
 * rather than its reference. The record form includes its keys: two records can share the same
 * URLs while mapping them to different names, and those are not interchangeable.
 */
function inputSignature(input: string | string[] | Record<string, string>): string {
  if (typeof input === 'string') return input
  if (Array.isArray(input)) return input.join('\0')
  return Object.keys(input)
    .sort()
    .map((key) => `${key}\0${input[key]}`)
    .join('\u0001')
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
 * // Textures are registered in the global registry by default — the same texture
 * // object is shared across components and modifications (colorSpace, wrapS, etc.) are preserved
 * const diffuse = useTexture('/diffuse.png')
 * diffuse.colorSpace = THREE.SRGBColorSpace
 *
 * // Another component gets the SAME texture with colorSpace already set
 * const sameDiffuse = useTexture('/diffuse.png')
 *
 * // Opt out of registry enrollment for a one-off texture
 * const scratch = useTexture('/scratch.png', { cache: false })
 *
 * // Access the registry directly
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

  // Normalize options - support both legacy callback and options object
  const options: UseTextureOptions<Url> =
    typeof optionsOrOnLoad === 'function' ? { onLoad: optionsOrOnLoad } : (optionsOrOnLoad ?? {})

  const { onLoad, cache = true } = options

  // Use ref for onLoad to avoid re-running effect when callback reference changes
  const onLoadRef = useRef(onLoad)
  onLoadRef.current = onLoad

  // Track which input we've already called onLoad for (prevents duplicate calls on re-render)
  const onLoadCalledForRef = useRef<string | null>(null)

  //* Identity-stable view of `input` --
  // Callers routinely pass an inline literal — useTexture(['/a.png', '/b.png']) or
  // useTexture({ map: '/a.png' }) — so `input` is a fresh reference on every render. Everything
  // below keys off `inputKey` (a value, so it compares by equality) and `stableInput` instead of
  // the raw reference. Without this the registry effect re-runs every render and its setState
  // re-renders every store subscriber, which feed each other until React bails out with
  // "Maximum update depth exceeded" (#3849). Hoisting the argument to a module constant did not
  // help, because the instability was never only in `input`.
  const inputKey = useMemo(() => inputSignature(input), [input])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the value, not the reference
  const stableInput = useMemo(() => input, [inputKey])

  //* Check the registry once at mount (non-reactive) --
  // If all requested textures are already registered, use those (preserves modifications). We read
  // the registry imperatively rather than subscribing, so a mounted useTexture never re-renders on a
  // registry change — loading texture A can't re-render a component using texture B.
  const urls = useMemo(() => getUrls(stableInput), [stableInput])

  const cachedResult = useMemo(() => {
    if (!cache) return null
    const textures = store.getState().textures
    if (!allUrlsCached(urls, textures)) return null
    return buildFromCache(stableInput, textures)
    // Intentionally not keyed on the registry contents — this is a one-time read at mount (per input).
  }, [cache, urls, stableInput, store])

  //* Load via useLoader (handles suspense) --
  // This always runs to maintain hooks order, but we may not use the result
  const loadedTextures = useLoader(
    TextureLoader,
    IsObject(stableInput) ? Object.values(stableInput) : stableInput,
  ) as MappedTextureType<Url>

  // Call onLoad when textures are ready (only on initial load, not cache hits)
  // Keyed on inputKey (computed above) so repeat renders don't re-fire the callback
  useLayoutEffect(() => {
    if (cachedResult) return
    if (onLoadCalledForRef.current === inputKey) return
    onLoadCalledForRef.current = inputKey
    onLoadRef.current?.(loadedTextures)
  }, [cachedResult, loadedTextures, inputKey])

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

    if (IsObject(stableInput)) {
      const keyed = {} as Record<string, _Texture>
      const textureArray = loadedTextures as _Texture[]
      let i = 0
      for (const key in stableInput) keyed[key] = textureArray[i++]
      return keyed as TextureRecord<Url>
    } else {
      return loadedTextures
    }
  }, [stableInput, loadedTextures, cachedResult])

  //* Register in the texture cache + refcount while mounted --
  // Adds missing textures and retains them so useTextures().dispose() is safe; releases on unmount.
  // Textures stay in the registry after the last release (persist until explicit dispose).
  useEffect(() => {
    if (!cache) return

    // Build URL → texture mapping (works for cache hits and fresh loads; mappedTextures is final either way)
    const urlTextureMap: Array<[string, _Texture]> = []

    if (typeof stableInput === 'string') {
      urlTextureMap.push([stableInput, mappedTextures as _Texture])
    } else if (Array.isArray(stableInput)) {
      const textureArray = mappedTextures as _Texture[]
      stableInput.forEach((url, i) => urlTextureMap.push([url, textureArray[i]]))
    } else if (IsObject(stableInput)) {
      const textureRecord = mappedTextures as Record<string, _Texture>
      for (const key in stableInput) {
        const url = stableInput[key]
        urlTextureMap.push([url, textureRecord[key]])
      }
    }

    // Retain: add missing textures and increment their refcount so useTextures().dispose() is safe.
    // Only clone `textures` (and so notify registry subscribers) when a texture is actually added —
    // a refcount-only bump (re-mounting an already-cached consumer) must not churn the registry.
    store.setState((state) => {
      const refs = new Map(state._textureRefs)
      let textures = state.textures
      let added = false
      for (const [url, texture] of urlTextureMap) {
        if (!textures.has(url)) {
          if (!added) {
            textures = new Map(textures)
            added = true
          }
          textures.set(url, texture)
        }
        refs.set(url, (refs.get(url) ?? 0) + 1)
      }
      return added ? { textures, _textureRefs: refs } : { _textureRefs: refs }
    })

    // Release on unmount: decrement refcount. Textures persist until explicit dispose.
    return () =>
      store.setState((state) => {
        const refs = new Map(state._textureRefs)
        for (const [url] of urlTextureMap) {
          const next = (refs.get(url) ?? 0) - 1
          if (next <= 0) refs.delete(url)
          else refs.set(url, next)
        }
        return { _textureRefs: refs }
      })
  }, [cache, stableInput, mappedTextures, store])

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
