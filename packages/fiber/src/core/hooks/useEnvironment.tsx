// Relative imports keep this module out of any entry's dependency graph: it is part of the shared
// core chunk every entry imports.
import { useLoader, useThree } from './'
import { getThree } from '../three'
import { suspend } from 'suspend-react'
import { presetsObj, PresetsType } from '../components/Environment/environment-assets'
import { useLayoutEffect } from 'react'

import type { Texture, Loader, CubeTexture, ColorSpace } from 'three'
import type { ConstructorRepresentation, LoaderLike, RendererSupport } from '#types'

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
// Every decoder is loaded on demand. The three addon loaders import from `three`, and the gain map
// decoder renders with a renderer of its own, so none of them may sit in core's eager graph: a
// `preset` environment is one `.hdr`, and used to ship the EXR and gain map decoders alongside.

type EnvironmentLoader = ConstructorRepresentation<LoaderLike>
type EnvironmentFormat = 'cube' | 'hdr-cube' | 'hdr' | 'exr' | 'jpg' | 'webp'

/** True for the formats whose decoder renders with the root's renderer (and so cannot be preloaded). */
const isGainMap = (format: EnvironmentFormat) => format === 'jpg' || format === 'webp'

// Loaders already resolved, so `clear` and a second `useEnvironment` need no round trip.
const loadedLoaders = new Map<string, EnvironmentLoader>()

async function loadLoader(format: EnvironmentFormat, support?: RendererSupport): Promise<EnvironmentLoader> {
  const key = format === 'webp' ? `webp:${support?.kind}` : format
  const cached = loadedLoaders.get(key)
  if (cached) return cached

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
    case 'webp': {
      // The decoder renders with a renderer of the root's flavour: the support supplies it.
      if (!support) throw new Error('useEnvironment: gain map (.webp) environments need a mounted Canvas')
      loader = await support.loadGainMapLoader()
      break
    }
  }
  loadedLoaders.set(key, loader)
  return loader
}

const LOADER_KEY = Symbol('r3f-environment-loader')

/** Suspend until the decoder for `format` is loaded. */
function useEnvironmentLoader(format: EnvironmentFormat, support: RendererSupport): EnvironmentLoader {
  return suspend(() => loadLoader(format, support), [LOADER_KEY, format, format === 'webp' ? support.kind : ''])
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

  const renderer = useThree((state) => state.renderer)
  const support = useThree((state) => state.internal.support)
  const loader = useEnvironmentLoader(format, support)

  useLayoutEffect(() => {
    // Only required for gainmap
    if (!isGainMap(format)) return

    function clearGainmapTexture() {
      useLoader.clear(loader, (multiFile ? [files] : files) as string | string[] | string[][])
    }

    renderer.domElement.addEventListener('webglcontextlost', clearGainmapTexture, { once: true })
  }, [format, files, loader, multiFile, renderer.domElement])

  const loaderResult: Texture | Texture[] = useLoader(
    loader,
    (multiFile ? [files] : files) as string | string[] | string[][],
    (loader) => {
      // Gainmap requires a renderer
      if (isGainMap(format)) {
        ;(loader as any).setRenderer?.(renderer)
      }
      ;(loader as any).setPath?.(path)
      if (extensions) extensions(loader as any)
    },
  ) as Texture | Texture[]
  let texture: Texture | CubeTexture = multiFile
    ? // @ts-ignore
      loaderResult[0]
    : loaderResult

  if (isGainMap(format)) {
    texture = (texture as any).renderTarget?.texture
  }

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

  if (isGainMap(format)) {
    throw new Error('useEnvironment: Preloading gainmaps is not supported')
  }

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

  // A decoder that never loaded has nothing cached under it. Gain maps are keyed per renderer.
  const input = isArray(files) ? [files] : files
  for (const [key, loader] of loadedLoaders) {
    if (key === format || key.startsWith(`${format}:`)) useLoader.clear(loader, input)
  }
}

function validatePreset(preset: string) {
  if (!(preset in presetsObj)) throw new Error('Preset must be one of: ' + Object.keys(presetsObj).join(', '))
}

function getFormat(files: string | string[]): { format: EnvironmentFormat | undefined; isCubemap: boolean } {
  const isCubemap = isArray(files) && files.length === 6
  const isGainmap = isArray(files) && files.length === 3 && files.some((file) => file.endsWith('json'))
  const firstEntry = isArray(files) ? files[0] : files
  const firstExtension = firstEntry.split('.').pop()?.split('?')?.shift()?.toLowerCase()

  // A six-file set is a cubemap, but its faces decide the loader: Radiance `.hdr` faces need
  // HDRCubeTextureLoader, everything else goes through the plain CubeTextureLoader.
  let format: EnvironmentFormat | undefined
  if (isCubemap) format = firstExtension === 'hdr' ? 'hdr-cube' : 'cube'
  else if (isGainmap) format = 'webp'
  else if (firstEntry.startsWith('data:application/exr')) format = 'exr'
  else if (firstEntry.startsWith('data:application/hdr')) format = 'hdr'
  else if (firstEntry.startsWith('data:image/jpeg')) format = 'jpg'
  else if (firstExtension === 'hdr' || firstExtension === 'exr' || firstExtension === 'webp') format = firstExtension
  else if (firstExtension === 'jpg' || firstExtension === 'jpeg') format = 'jpg'

  return { format, isCubemap }
}
