// Relative imports keep this module out of any entry's dependency graph: it is part of the shared
// core chunk every entry imports.
import { useLoader } from './'
import { getThree } from '../three'
import { suspend } from 'suspend-react'
import { presetsObj, PresetsType } from '../components/Environment/environment-assets'

import type { Texture, Loader, CubeTexture, ColorSpace, DataTexture } from 'three'
import type { UltraHDRLoader } from 'three/examples/jsm/loaders/UltraHDRLoader.js'
import type { ConstructorRepresentation, LoaderLike } from '#types'

const CUBEMAP_ROOT = 'https://raw.githack.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/'
const isArray = (arr: any): arr is string[] => Array.isArray(arr)

export type EnvironmentLoaderProps = {
  files?: string | string[]
  path?: string
  preset?: PresetsType
  extensions?: (loader: Loader) => void
  colorSpace?: ColorSpace
}

const defaultFiles = ['/px.png', '/nx.png', '/py.png', '/ny.png', '/pz.png', '/nz.png']

//* Formats ==============================
// Every decoder is loaded on demand. The three addon loaders import from `three`, so none of them
// may sit in core's eager graph: a `preset` environment is one `.hdr`, and used to ship the EXR
// decoder alongside. All of them decode on the CPU, so none needs the root's renderer; the `.jpg`
// one is three's own UltraHDRLoader (the single-file Ultra HDR standard), falling back to a plain
// image for a JPEG without a gain map. A `.png`, `.webp`, `.avif` or `.gif` is an LDR equirect
// image and goes through three's core TextureLoader.

type EnvironmentLoader = ConstructorRepresentation<LoaderLike>
type EnvironmentFormat = 'cube' | 'hdr-cube' | 'hdr' | 'exr' | 'jpg' | 'ldr'

// Loaders already resolved, so `clear` and a second `useEnvironment` need no round trip.
const loadedLoaders = new Map<EnvironmentFormat, EnvironmentLoader>()
// One import per format, shared by every caller, so `clear` can queue behind a pending `preload`.
const pendingLoaders = new Map<EnvironmentFormat, Promise<EnvironmentLoader>>()

function loadLoader(format: EnvironmentFormat): Promise<EnvironmentLoader> {
  let pending = pendingLoaders.get(format)
  if (!pending) {
    pending = importLoader(format).then(
      (loader) => {
        loadedLoaders.set(format, loader)
        return loader
      },
      (error) => {
        // Let a later call retry a failed import
        pendingLoaders.delete(format)
        throw error
      },
    )
    pendingLoaders.set(format, pending)
  }
  return pending
}

async function importLoader(format: EnvironmentFormat): Promise<EnvironmentLoader> {
  let loader: EnvironmentLoader
  switch (format) {
    case 'cube':
      loader = getThree().CubeTextureLoader
      break
    case 'hdr-cube':
      loader = (await import('three/examples/jsm/loaders/HDRCubeTextureLoader.js')).HDRCubeTextureLoader
      break
    case 'hdr':
      loader = (await import('three/examples/jsm/loaders/HDRLoader.js')).HDRLoader
      break
    case 'exr':
      loader = (await import('three/examples/jsm/loaders/EXRLoader.js')).EXRLoader
      break
    case 'jpg':
      loader = createJpegLoader((await import('three/examples/jsm/loaders/UltraHDRLoader.js')).UltraHDRLoader)
      break
    case 'ldr':
      loader = getThree().TextureLoader
      break
  }
  return loader
}

/**
 * A `.jpg` is Ultra HDR only when it carries a gain map; most are plain photos, which UltraHDRLoader
 * rejects. This reads the file once and lets UltraHDRLoader validate it: an Ultra HDR file decodes
 * as linear HDR data exactly as before, any other JPEG decodes from the same bytes as an sRGB image.
 * It stays an UltraHDRLoader, so `extensions` can still call `setDataType`.
 */
function createJpegLoader(UltraHDR: typeof UltraHDRLoader): EnvironmentLoader {
  return class JpegEnvironmentLoader extends UltraHDR {
    // @ts-expect-error A plain JPEG resolves to a Texture, not the DataTexture UltraHDRLoader declares
    override load(
      url: string,
      onLoad?: (texture: Texture) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (error: unknown) => void,
    ): void {
      const three = getThree()
      const file = new three.FileLoader(this.manager)
      file.setResponseType('arraybuffer')
      file.setRequestHeader(this.requestHeader)
      file.setPath(this.path)
      file.setWithCredentials(this.withCredentials)
      file.load(
        url,
        (buffer) => {
          try {
            // Validation throws synchronously, before any decoding starts
            this.parse(buffer as ArrayBuffer, (texData) => {
              // three passes the pixels as `data`; @types/three calls the field `hdrBuffer`
              const { data } = texData as unknown as { data: Uint16Array | Float32Array }
              const texture = new three.DataTexture(data, texData.width, texData.height, three.RGBAFormat, texData.type)
              texture.minFilter = three.LinearMipMapLinearFilter
              texture.magFilter = three.LinearFilter
              texture.generateMipmaps = true
              texture.flipY = true
              texture.needsUpdate = true
              onLoad?.(texture)
            })
          } catch {
            // No gain map: an ordinary JPEG. Decode the bytes already fetched rather than fetch again.
            const objectURL = URL.createObjectURL(new Blob([buffer as ArrayBuffer], { type: 'image/jpeg' }))
            const settle = () => URL.revokeObjectURL(objectURL)
            new three.ImageLoader().load(
              objectURL,
              (image) => {
                settle()
                const texture = new three.Texture(image)
                texture.needsUpdate = true
                onLoad?.(texture)
              },
              undefined,
              (error) => {
                settle()
                onError?.(error)
              },
            )
          }
        },
        onProgress,
        onError,
      )
    }
  }
}

const LOADER_KEY = Symbol('r3f-environment-loader')

/** Suspend until the decoder for `format` is loaded. */
function useEnvironmentLoader(format: EnvironmentFormat): EnvironmentLoader {
  return suspend(() => loadLoader(format), [LOADER_KEY, format])
}

/**
 * Loads environment textures for reflections and lighting.
 * Supports HDR files, presets, and cubemaps.
 *
 * @example Basic usage
 * ```jsx
 * const texture = useEnvironment({ preset: 'sunset' })
 * ```
 */
export function useEnvironment({
  files = defaultFiles,
  path = '',
  preset = undefined,
  colorSpace = undefined,
  extensions,
}: Partial<EnvironmentLoaderProps> = {}) {
  if (preset) {
    validatePreset(preset)
    files = presetsObj[preset]
    path = CUBEMAP_ROOT
  }

  // Everything else
  const multiFile = isArray(files)

  const { format, isCubemap } = getFormat(files)
  if (!format) throw new Error('useEnvironment: Unrecognized file extension: ' + files)

  const loader = useEnvironmentLoader(format)

  const loaderResult: Texture | Texture[] = useLoader(
    loader,
    (multiFile ? [files] : files) as string | string[] | string[][],
    (loader) => {
      ;(loader as any).setPath?.(path)
      if (extensions) extensions(loader as any)
    },
  ) as Texture | Texture[]
  const texture: Texture | CubeTexture = multiFile
    ? // @ts-ignore
      loaderResult[0]
    : loaderResult

  const three = getThree()
  texture.mapping = isCubemap ? three.CubeReflectionMapping : three.EquirectangularReflectionMapping

  // HDR data (.hdr, .exr, Ultra HDR, an .hdr cube set) carries linear radiance. LDR images (cube
  // faces, a single equirect, a JPEG without a gain map) are sRGB.
  const hdr = format === 'hdr-cube' || (texture as DataTexture).isDataTexture === true
  texture.colorSpace = colorSpace ?? (hdr ? 'srgb-linear' : 'srgb')

  return texture
}

/**
 * Options accepted by `useEnvironment.preload`.
 *
 * `colorSpace` is deliberately omitted: preload only warms the loader cache, and colorSpace is
 * applied to the texture by `useEnvironment()` at use time, per consumer. Accepting it here would
 * advertise an option this function silently ignores.
 */
type EnvironmentLoaderPreloadOptions = Omit<EnvironmentLoaderProps, 'colorSpace'>
const preloadDefaultOptions = {
  files: defaultFiles,
  path: '',
  preset: undefined,
  extensions: undefined,
}

/**
 * Warm the loader cache for an environment. The decoder itself loads on demand, so this resolves
 * the decoder first and then starts the file load; `useEnvironment` finds both in the cache.
 */
useEnvironment.preload = (preloadOptions?: EnvironmentLoaderPreloadOptions) => {
  const options = { ...preloadDefaultOptions, ...preloadOptions }
  let { files, path = '' } = options
  const { preset, extensions } = options

  if (preset) {
    validatePreset(preset)
    files = presetsObj[preset]
    path = CUBEMAP_ROOT
  }

  const { format } = getFormat(files)
  if (!format) throw new Error('useEnvironment: Unrecognized file extension: ' + files)

  const input = isArray(files) ? [files] : files
  loadLoader(format).then((loader) => {
    useLoader.preload(loader, input, (loader) => {
      ;(loader as any).setPath?.(path)
      if (extensions) extensions(loader as any)
    })
  })
}

type EnvironmentLoaderClearOptions = Pick<EnvironmentLoaderProps, 'files' | 'preset'>
const clearDefaultOptins = {
  files: defaultFiles,
  preset: undefined,
}

useEnvironment.clear = (clearOptions?: EnvironmentLoaderClearOptions) => {
  const options = { ...clearDefaultOptins, ...clearOptions }
  let { files } = options
  const { preset } = options

  if (preset) {
    validatePreset(preset)
    files = presetsObj[preset]
  }

  const { format } = getFormat(files)
  if (!format) throw new Error('useEnvironment: Unrecognized file extension: ' + files)

  const input = isArray(files) ? [files] : files
  const clear = (loader: EnvironmentLoader) => useLoader.clear(loader, input)
  const loader = loadedLoaders.get(format)
  if (loader) {
    clear(loader)
  } else {
    // A preload may be waiting for its decoder. Its callback runs first, then this one clears it.
    // A decoder that never loaded, or failed to, has nothing cached under it.
    const pending = pendingLoaders.get(format)
    if (pending) void pending.then(clear, () => {})
  }
}

function validatePreset(preset: string) {
  if (!(preset in presetsObj)) throw new Error('Preset must be one of: ' + Object.keys(presetsObj).join(', '))
}

function getFormat(files: string | string[]): { format: EnvironmentFormat | undefined; isCubemap: boolean } {
  const isCubemap = isArray(files) && files.length === 6
  const firstEntry = isArray(files) ? files[0] : files
  // The extension of the path, ignoring any query or hash (`sky.hdr?v=2`, `sky.hdr#rev`)
  const firstExtension = firstEntry.split(/[?#]/)[0].split('.').pop()?.toLowerCase()

  // A six-file set is a cubemap, but its faces decide the loader: Radiance `.hdr` faces need
  // HDRCubeTextureLoader, everything else goes through the plain CubeTextureLoader.
  let format: EnvironmentFormat | undefined
  if (isCubemap) format = firstExtension === 'hdr' ? 'hdr-cube' : 'cube'
  else if (firstEntry.startsWith('data:application/exr')) format = 'exr'
  else if (firstEntry.startsWith('data:application/hdr')) format = 'hdr'
  else if (firstEntry.startsWith('data:image/jpeg')) format = 'jpg'
  else if (firstExtension === 'hdr' || firstExtension === 'exr') format = firstExtension
  else if (firstExtension === 'jpg' || firstExtension === 'jpeg') format = 'jpg'
  else if (/^data:image\/(png|webp|avif|gif)[;,]/.test(firstEntry)) format = 'ldr'
  else if (['png', 'webp', 'avif', 'gif'].includes(firstExtension!)) format = 'ldr'

  return { format, isCubemap }
}
