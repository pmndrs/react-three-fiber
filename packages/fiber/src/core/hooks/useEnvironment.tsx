// Relative, never the package name. A self-import leaves rollup unable to resolve the specifier,
// so it stays external and every entry ends up importing `@react-three/fiber` -- which resolves
// back to the default entry and drags `three/webgpu` into the WebGL-only build. See verify-bundles.
import { useLoader, useThree } from './'
import type { ConstructorRepresentation, LoaderLike } from '#types'
import {
  EquirectangularReflectionMapping,
  CubeTextureLoader,
  Texture,
  Loader,
  CubeReflectionMapping,
  ColorSpace,
  AnyMapping,
} from 'three'
import { presetsObj, PresetsType } from '../components/Environment/environment-assets'
import { useLayoutEffect } from 'react'
import { suspend } from 'suspend-react'

//* Formats ==============================
// Everything an environment format decides lives in this table. The hook, preload and clear only
// consult it, so supporting a new format means adding a row rather than a branch.

/** The optional configuration surface shared by three's texture loaders and the gain map decoder. */
interface EnvironmentLoaderInstance extends LoaderLike {
  setPath?(path: string): unknown
  setRenderer?(renderer: unknown): unknown
}

type EnvironmentLoader = ConstructorRepresentation<EnvironmentLoaderInstance>

interface EnvironmentFormat {
  /** Resolves the loader class on first use so bundlers split each decoder into its own chunk. */
  load: () => Promise<EnvironmentLoader>
  mapping: AnyMapping
  /** Applied when the caller does not pass a color space. */
  colorSpace: ColorSpace
  /**
   * Decodes on the GPU: the loader needs the renderer, hands back a render target instead of a
   * texture, cannot be preloaded, and must be dropped when the context is lost.
   */
  gpu?: boolean
}

type EnvironmentFormatName = 'cube' | 'hdr-cube' | 'hdr' | 'exr' | 'jpg' | 'webp'

const FORMATS: Record<EnvironmentFormatName, EnvironmentFormat> = {
  // LDR cube faces are sRGB images; every other format carries linear radiance.
  cube: {
    load: async () => CubeTextureLoader,
    mapping: CubeReflectionMapping,
    colorSpace: 'srgb',
  },
  'hdr-cube': {
    load: () => import('three/examples/jsm/loaders/HDRCubeTextureLoader.js').then((m) => m.HDRCubeTextureLoader),
    mapping: CubeReflectionMapping,
    colorSpace: 'srgb-linear',
  },
  hdr: {
    load: () => import('three/examples/jsm/loaders/HDRLoader.js').then((m) => m.HDRLoader),
    mapping: EquirectangularReflectionMapping,
    colorSpace: 'srgb-linear',
  },
  exr: {
    load: () => import('three/examples/jsm/loaders/EXRLoader.js').then((m) => m.EXRLoader),
    mapping: EquirectangularReflectionMapping,
    colorSpace: 'srgb-linear',
  },
  jpg: {
    load: () => import('three/examples/jsm/loaders/UltraHDRLoader.js').then((m) => m.UltraHDRLoader),
    mapping: EquirectangularReflectionMapping,
    colorSpace: 'srgb-linear',
    gpu: true,
  },
  webp: {
    load: () => import('@monogrid/gainmap-js').then((m) => m.GainMapLoader),
    mapping: EquirectangularReflectionMapping,
    colorSpace: 'srgb-linear',
    gpu: true,
  },
}

//* Loader cache ==============================
// One promise per format, shared by the hook, preload and clear, so a decoder is fetched once and
// clear can find it without pulling it in.

const LOADER_KEY = '@react-three/fiber/useEnvironment'
const pendingLoaders = new Map<EnvironmentFormatName, Promise<EnvironmentLoader>>()
const loadedLoaders = new Map<EnvironmentFormatName, EnvironmentLoader>()

function loadLoader(name: EnvironmentFormatName): Promise<EnvironmentLoader> {
  let pending = pendingLoaders.get(name)
  if (!pending) {
    pending = FORMATS[name].load().then((loader) => {
      loadedLoaders.set(name, loader)
      return loader
    })
    pendingLoaders.set(name, pending)
  }
  return pending
}

/** Suspends until the format's loader is available. */
const useEnvironmentLoader = (name: EnvironmentFormatName): EnvironmentLoader =>
  suspend(() => loadLoader(name), [LOADER_KEY, name])

//* Source resolution ==============================
// Props name a source in several ways (preset, single file, cube faces, gain map triplet). This is
// the one place that turns them into something the loaders understand.

const CUBEMAP_ROOT = 'https://raw.githack.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/'
const defaultFiles = ['/px.png', '/nx.png', '/py.png', '/ny.png', '/pz.png', '/nz.png']
const isArray = (arr: any): arr is string[] => Array.isArray(arr)

export type EnvironmentLoaderProps = {
  files?: string | string[]
  path?: string
  preset?: PresetsType
  extensions?: (loader: Loader) => void
  colorSpace?: ColorSpace
}

interface EnvironmentSource {
  files: string | string[]
  path: string
  format: EnvironmentFormatName
}

function resolveSource({
  files = defaultFiles,
  path = '',
  preset,
}: Pick<EnvironmentLoaderProps, 'files' | 'path' | 'preset'> = {}): EnvironmentSource {
  if (preset) {
    if (!(preset in presetsObj)) throw new Error('Preset must be one of: ' + Object.keys(presetsObj).join(', '))
    files = presetsObj[preset]
    path = CUBEMAP_ROOT
  }

  const format = detectFormat(files)
  if (!format) throw new Error('useEnvironment: Unrecognized file extension: ' + files)

  return { files, path, format }
}

function detectFormat(files: string | string[]): EnvironmentFormatName | undefined {
  const first = isArray(files) ? files[0] : files
  const extension = first.split('.').pop()?.split('?').shift()?.toLowerCase()

  // A six-file set is a cubemap, but its faces decide the loader: Radiance `.hdr` faces need
  // HDRCubeTextureLoader, everything else goes through the plain CubeTextureLoader.
  if (isArray(files) && files.length === 6) return extension === 'hdr' ? 'hdr-cube' : 'cube'
  // A gain map ships as an SDR image, a gain map image and a JSON metadata file.
  if (isArray(files) && files.length === 3 && files.some((file) => file.endsWith('json'))) return 'webp'

  if (first.startsWith('data:application/exr')) return 'exr'
  if (first.startsWith('data:application/hdr')) return 'hdr'
  if (first.startsWith('data:image/jpeg')) return 'jpg'

  switch (extension) {
    case 'hdr':
    case 'exr':
    case 'webp':
      return extension
    case 'jpg':
    case 'jpeg':
      return 'jpg'
    default:
      return undefined
  }
}

/** A multi-file source is one input for the loader (a face set, a gain map triplet), not several. */
const toLoaderInput = (files: string | string[]) => (isArray(files) ? [files] : files)

/** Points a loader at the source before the caller's own extensions run. */
const configureLoader =
  (source: EnvironmentSource, extensions?: EnvironmentLoaderProps['extensions'], renderer?: unknown) =>
  (loader: EnvironmentLoaderInstance) => {
    if (renderer) loader.setRenderer?.(renderer)
    loader.setPath?.(source.path)
    extensions?.(loader as Loader)
  }

//* Hook ==============================

/**
 * Loads environment textures for reflections and lighting.
 * Supports HDR files, presets, and cubemaps.
 *
 * @example Basic usage
 * ```jsx
 * const texture = useEnvironment({ preset: 'sunset' })
 * ```
 */
export function useEnvironment({ colorSpace, extensions, ...props }: Partial<EnvironmentLoaderProps> = {}) {
  const source = resolveSource(props)
  const format = FORMATS[source.format]
  const renderer = useThree((state) => state.renderer)
  const loader = useEnvironmentLoader(source.format)

  // A GPU decoder's result lives in a render target, which dies with the context.
  useLayoutEffect(() => {
    if (!format.gpu) return
    const drop = () => useLoader.clear(loader, toLoaderInput(source.files))
    renderer.domElement.addEventListener('webglcontextlost', drop, { once: true })
    return () => renderer.domElement.removeEventListener('webglcontextlost', drop)
  }, [format.gpu, loader, source.files, renderer.domElement])

  const result = useLoader(
    loader,
    toLoaderInput(source.files),
    configureLoader(source, extensions, format.gpu ? renderer : undefined),
  )
  const loaded = Array.isArray(result) ? result[0] : result
  const texture: Texture = format.gpu ? loaded.renderTarget.texture : loaded

  texture.mapping = format.mapping
  texture.colorSpace = colorSpace ?? format.colorSpace

  return texture
}

//* Preload / clear ==============================

/**
 * Options accepted by `useEnvironment.preload`. `colorSpace` is omitted because preload only warms
 * the loader cache; the color space is applied to the texture by `useEnvironment()` per consumer.
 */
type EnvironmentLoaderPreloadOptions = Omit<EnvironmentLoaderProps, 'colorSpace'>

useEnvironment.preload = ({ extensions, ...props }: EnvironmentLoaderPreloadOptions = {}) => {
  const source = resolveSource(props)
  if (FORMATS[source.format].gpu) {
    throw new Error('useEnvironment: gain maps decode through the renderer and cannot be preloaded')
  }

  loadLoader(source.format).then((loader) =>
    useLoader.preload(loader, toLoaderInput(source.files), configureLoader(source, extensions)),
  )
}

type EnvironmentLoaderClearOptions = Pick<EnvironmentLoaderProps, 'files' | 'preset'>

useEnvironment.clear = (options: EnvironmentLoaderClearOptions = {}) => {
  const source = resolveSource(options)
  const input = toLoaderInput(source.files)
  const clear = (loader: EnvironmentLoader) => useLoader.clear(loader, input)
  const loader = loadedLoaders.get(source.format)
  if (loader) {
    clear(loader)
  } else {
    // A preload may be waiting for its decoder. Its callback runs first, then this one clears it.
    // A failed decoder import has no texture entry to clear.
    const pending = pendingLoaders.get(source.format)
    if (pending) void pending.then(clear, () => {})
  }
}
