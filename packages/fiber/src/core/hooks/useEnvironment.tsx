// Relative imports keep this module out of any entry's dependency graph: it is part of the shared
// core chunk every entry imports.
import { useLoader } from './'
import { getThree } from '../three'
import { suspend } from 'suspend-react'
import { presetsObj, PresetsType } from '../components/Environment/environment-assets'

import type { Texture, Loader, CubeTexture, ColorSpace } from 'three'
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
// one is three's own UltraHDRLoader (the single-file Ultra HDR standard).

type EnvironmentLoader = ConstructorRepresentation<LoaderLike>
type EnvironmentFormat = 'cube' | 'hdr-cube' | 'hdr' | 'exr' | 'jpg'

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
      loader = (await import('three/examples/jsm/loaders/UltraHDRLoader.js')).UltraHDRLoader
      break
  }
  return loader
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

  // LDR cube faces are sRGB images; an HDR cube set carries linear radiance like an equirect .hdr
  texture.colorSpace = colorSpace ?? (isCubemap && format !== 'hdr-cube' ? 'srgb' : 'srgb-linear')

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
  const firstExtension = firstEntry.split('.').pop()?.split('?')?.shift()?.toLowerCase()

  // A six-file set is a cubemap, but its faces decide the loader: Radiance `.hdr` faces need
  // HDRCubeTextureLoader, everything else goes through the plain CubeTextureLoader.
  let format: EnvironmentFormat | undefined
  if (isCubemap) format = firstExtension === 'hdr' ? 'hdr-cube' : 'cube'
  else if (firstEntry.startsWith('data:application/exr')) format = 'exr'
  else if (firstEntry.startsWith('data:application/hdr')) format = 'hdr'
  else if (firstEntry.startsWith('data:image/jpeg')) format = 'jpg'
  else if (firstExtension === 'hdr' || firstExtension === 'exr') format = firstExtension
  else if (firstExtension === 'jpg' || firstExtension === 'jpeg') format = 'jpg'

  return { format, isCubemap }
}
