import * as React from 'react'
import { useThree, createPortal, useFrame, extend, Euler, applyProps, ThreeElement } from '@react-three/fiber'
import {
  WebGLCubeRenderTarget,
  Texture,
  Scene,
  CubeCamera,
  HalfFloatType,
  CubeTexture,
  Color,
  ColorRepresentation,
} from '#three'
import { GroundedSkybox as GroundProjectedEnvImpl } from 'three/examples/jsm/objects/GroundedSkybox.js'
import { presetsObj, PresetsType } from './environment-assets'
import { EnvironmentLoaderProps, useEnvironment } from '../../hooks/useEnvironment'

/**
 * Props for Environment component that sets up global cubemap for PBR materials and backgrounds.
 *
 * @property children - React children to render into custom environment portal
 * @property frames - Number of frames to render the environment. Use 1 for static, Infinity for animated (default: 1)
 * @property near - Near clipping plane for cube camera (default: 0.1)
 * @property far - Far clipping plane for cube camera (default: 1000)
 * @property resolution - Resolution of the cube render target (default: 256)
 * @property background - Whether to set scene.background. Can be true, false, or "only" (which only sets background) (default: false)
 *
 * @property blur - @deprecated Use backgroundBlurriness instead
 * @property backgroundBlurriness - Blur factor between 0 and 1 for background (default: 0, requires three.js 0.146+)
 * @property backgroundIntensity - Intensity factor for background (default: 1, requires three.js 0.163+)
 * @property backgroundRotation - Rotation for background as Euler angles (default: [0,0,0], requires three.js 0.163+)
 * @property environmentIntensity - Intensity factor for environment lighting (default: 1, requires three.js 0.163+)
 * @property environmentRotation - Rotation for environment as Euler angles (default: [0,0,0], requires three.js 0.163+)
 *
 * @property map - Pre-existing texture to use as environment map
 * @property preset - HDRI Haven preset: 'apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse'. Not for production use.
 * @property scene - Custom THREE.Scene or ref to apply environment to (default: uses default scene)
 * @property ground - Ground projection settings. Use true for defaults or object with:
 *   - height: Height of camera used to create env map (default: 15)
 *   - radius: Radius of the world (default: 60)
 *   - scale: Scale of backside projected sphere (default: 1000)
 *
 * Additional loader props:
 * @property files - File path(s) for environment. Supports .hdr, .exr, gainmap .jpg/.webp, or array of 6 cube faces
 * @property path - Base path for file loading
 * @property extensions - Texture extensions override
 */
export type EnvironmentProps = {
  children?: React.ReactNode
  frames?: number
  near?: number
  far?: number
  resolution?: number
  background?: boolean | 'only'

  /** deprecated, use backgroundBlurriness */
  blur?: number
  backgroundBlurriness?: number
  backgroundIntensity?: number
  backgroundRotation?: Euler
  environmentIntensity?: number
  environmentRotation?: Euler

  map?: Texture
  preset?: PresetsType
  scene?: Scene | React.RefObject<Scene>
  ground?:
    | boolean
    | {
        radius?: number
        height?: number
        scale?: number
      }

  /** Solid color for background (alternative to files/preset) */
  color?: ColorRepresentation

  /** Separate files for background (when different from environment files) */
  backgroundFiles?: string | string[]
} & EnvironmentLoaderProps

/**
 * Type guard to check if object is a React ref to a Scene
 */
const isRef = (obj: any): obj is React.RefObject<Scene> => obj.current && obj.current.isScene

/**
 * Resolves a Scene from either a direct Scene object or a React ref
 */
const resolveScene = (scene: Scene | React.RefObject<Scene>) => (isRef(scene) ? scene.current : scene)

/**
 * Internal utility to set environment and background properties on a scene.
 * Applies texture to scene.environment and/or scene.background based on settings.
 * Returns cleanup function to restore original values.
 *
 * @param background - Whether to set background (true/false/'only')
 * @param scene - Custom scene to apply to (optional)
 * @param defaultScene - Default scene from Three.js context
 * @param texture - Texture to apply as environment/background
 * @param sceneProps - Additional scene properties (blurriness, intensity, rotation)
 * @returns Cleanup function that restores original scene properties
 */
function setEnvProps(
  background: boolean | 'only',
  scene: Scene | React.RefObject<Scene> | undefined,
  defaultScene: Scene,
  texture: Texture,
  sceneProps: Partial<EnvironmentProps> = {},
) {
  // defaults
  sceneProps = {
    backgroundBlurriness: 0,
    backgroundIntensity: 1,
    backgroundRotation: [0, 0, 0],
    environmentIntensity: 1,
    environmentRotation: [0, 0, 0],
    ...sceneProps,
  }

  const target = resolveScene(scene || defaultScene)
  const oldbg = target.background
  const oldenv = target.environment
  const oldSceneProps = {
    // @ts-ignore
    backgroundBlurriness: target.backgroundBlurriness,
    // @ts-ignore
    backgroundIntensity: target.backgroundIntensity,
    // @ts-ignore
    backgroundRotation: target.backgroundRotation?.clone?.() ?? [0, 0, 0],
    // @ts-ignore
    environmentIntensity: target.environmentIntensity,
    // @ts-ignore
    environmentRotation: target.environmentRotation?.clone?.() ?? [0, 0, 0],
  }
  if (background !== 'only') target.environment = texture
  if (background) target.background = texture
  applyProps(target as any, sceneProps)

  return () => {
    if (background !== 'only') target.environment = oldenv
    if (background) target.background = oldbg
    applyProps(target as any, oldSceneProps)
  }
}

/**
 * Internal component that applies a pre-existing texture as environment map.
 * Sets scene.environment and optionally scene.background.
 *
 * @example
 * ```jsx
 * <CubeCamera>{(texture) => <EnvironmentMap map={texture} />}</CubeCamera>
 * ```
 */
export function EnvironmentMap({ scene, background = false, map, ...config }: EnvironmentProps) {
  const defaultScene = useThree((state) => state.scene)
  React.useLayoutEffect(() => {
    if (map) return setEnvProps(background, scene, defaultScene, map, config)
  })
  return null
}

/**
 * Internal component that loads environment textures from files or presets.
 * Uses HDRLoader for .hdr, EXRLoader for .exr, UltraHDRLoader for .jpg/.jpeg HDR,
 * GainMapLoader for gainmap .webp, or CubeTextureLoader for arrays of images.
 *
 * @example With preset
 * ```jsx
 * <EnvironmentCube preset="sunset" />
 * ```
 *
 * @example From HDR file
 * ```jsx
 * <EnvironmentCube files="environment.hdr" />
 * ```
 *
 * @example From gainmap (smallest footprint)
 * ```jsx
 * <EnvironmentCube files={['file.webp', 'file-gainmap.webp', 'file.json']} />
 * ```
 *
 * @example From cube faces
 * ```jsx
 * <EnvironmentCube files={['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']} />
 * ```
 */
export function EnvironmentCube({
  background = false,
  scene,
  blur,
  backgroundBlurriness,
  backgroundIntensity,
  backgroundRotation,
  environmentIntensity,
  environmentRotation,
  ...rest
}: EnvironmentProps) {
  const texture = useEnvironment(rest)
  const defaultScene = useThree((state) => state.scene)

  React.useLayoutEffect(() => {
    return setEnvProps(background, scene, defaultScene, texture, {
      backgroundBlurriness: blur ?? backgroundBlurriness,
      backgroundIntensity,
      backgroundRotation,
      environmentIntensity,
      environmentRotation,
    })
  })

  React.useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  return null
}

/**
 * Internal component that renders custom environment using a portal and cube camera.
 * Renders children into an off-buffer and films with a cube camera to create environment map.
 * Can be static (frames=1) or animated (frames=Infinity).
 *
 * @example Custom environment with sphere
 * ```jsx
 * <EnvironmentPortal background near={1} far={1000} resolution={256}>
 *   <mesh scale={100}>
 *     <sphereGeometry args={[1, 64, 64]} />
 *     <meshBasicMaterial map={texture} side={THREE.BackSide} />
 *   </mesh>
 * </EnvironmentPortal>
 * ```
 *
 * @example Animated environment
 * ```jsx
 * <EnvironmentPortal frames={Infinity} resolution={256}>
 *   <Float>
 *     <mesh />
 *   </Float>
 * </EnvironmentPortal>
 * ```
 *
 * @example Mixed with preset
 * ```jsx
 * <EnvironmentPortal preset="warehouse">
 *   <mesh />
 * </EnvironmentPortal>
 * ```
 */
export function EnvironmentPortal({
  children,
  near = 0.1,
  far = 1000,
  resolution = 256,
  frames = 1,
  map,
  background = false,
  blur,
  backgroundBlurriness,
  backgroundIntensity,
  backgroundRotation,
  environmentIntensity,
  environmentRotation,
  scene,
  files,
  path,
  preset = undefined,
  extensions,
}: EnvironmentProps) {
  const gl = useThree((state) => state.gl)
  const defaultScene = useThree((state) => state.scene)
  const camera = React.useRef<CubeCamera>(null!)
  const [virtualScene] = React.useState(() => new Scene())
  const fbo = React.useMemo(() => {
    const fbo = new WebGLCubeRenderTarget(resolution)
    fbo.texture.type = HalfFloatType
    return fbo
  }, [resolution])

  React.useEffect(() => {
    return () => {
      fbo.dispose()
    }
  }, [fbo])

  React.useLayoutEffect(() => {
    if (frames === 1) {
      const autoClear = gl.autoClear
      gl.autoClear = true
      camera.current.update(gl, virtualScene)
      gl.autoClear = autoClear
    }
    return setEnvProps(background, scene, defaultScene, fbo.texture, {
      backgroundBlurriness: blur ?? backgroundBlurriness,
      backgroundIntensity,
      backgroundRotation,
      environmentIntensity,
      environmentRotation,
    })
  }, [children, virtualScene, fbo.texture, scene, defaultScene, background, frames, gl])

  let count = 1
  useFrame(() => {
    if (frames === Infinity || count < frames) {
      const autoClear = gl.autoClear
      gl.autoClear = true
      camera.current.update(gl, virtualScene)
      gl.autoClear = autoClear
      count++
    }
  })

  return (
    <>
      {createPortal(
        <>
          {children}
          {/* @ts-ignore */}
          <cubeCamera ref={camera} args={[near, far, fbo]} />
          {files || preset ? (
            <EnvironmentCube background files={files} preset={preset} path={path} extensions={extensions} />
          ) : map ? (
            <EnvironmentMap background map={map} extensions={extensions} />
          ) : null}
        </>,
        virtualScene,
      )}
    </>
  )
}

declare module '@react-three/fiber' {
  interface ThreeElements {
    groundProjectedEnvImpl: ThreeElement<typeof GroundProjectedEnvImpl>
  }
}

/**
 * Internal component for ground-projected environment.
 * Projects the environment onto a ground plane, placing your model on the "ground" within the env map.
 * Uses GroundProjectedEnv from three/examples/jsm/modifiers/GroundProjectedEnv.
 *
 * @example
 * ```jsx
 * <EnvironmentGround ground />
 * ```
 *
 * @example With custom settings
 * ```jsx
 * <EnvironmentGround
 *   ground={{
 *     height: 15, // Height of camera used to create env map
 *     radius: 60, // Radius of the world
 *     scale: 1000, // Scale of backside projected sphere
 *   }}
 * />
 * ```
 */
function EnvironmentGround(props: EnvironmentProps) {
  const textureDefault = useEnvironment(props)
  const texture = props.map || textureDefault

  React.useMemo(() => extend({ GroundProjectedEnvImpl }), [])

  React.useEffect(() => {
    return () => {
      textureDefault.dispose()
    }
  }, [textureDefault])

  const height = (props.ground as any)?.height ?? 15
  const radius = (props.ground as any)?.radius ?? 60
  const scale = (props.ground as any)?.scale ?? 1000

  const args = React.useMemo<[Texture | CubeTexture, number, number]>(
    () => [texture, height, radius],
    [texture, height, radius],
  )

  return (
    <>
      <EnvironmentMap {...props} map={texture} />
      <groundProjectedEnvImpl args={args} scale={scale} />
    </>
  )
}

/**
 * Internal component that sets a solid color as scene background.
 * Does not affect scene.environment (lighting/reflections).
 *
 * @example
 * ```jsx
 * <EnvironmentColor color="red" />
 * <EnvironmentColor color="#ff0000" />
 * <EnvironmentColor color={0xff0000} />
 * ```
 */
function EnvironmentColor({ color, scene }: EnvironmentProps) {
  const defaultScene = useThree((state) => state.scene)
  React.useLayoutEffect(() => {
    if (color === undefined) return
    const target = resolveScene(scene || defaultScene)
    const oldBg = target.background
    target.background = new Color(color)
    return () => {
      target.background = oldBg
    }
  })
  return null
}

/**
 * Internal component that handles separate background and environment textures.
 * Useful when you want different visuals for the backdrop vs. lighting/reflections.
 *
 * @example
 * ```jsx
 * <EnvironmentDualSource
 *   files="lighting.hdr"
 *   backgroundFiles="sky.jpg"
 *   background
 * />
 * ```
 */
function EnvironmentDualSource(props: EnvironmentProps) {
  const { backgroundFiles, ...envProps } = props
  return (
    <>
      <EnvironmentCube {...envProps} background={false} />
      <EnvironmentCube {...props} files={backgroundFiles} background="only" />
    </>
  )
}

/**
 * Sets up a global environment map for PBR materials and backgrounds.
 * Affects scene.environment and optionally scene.background unless a custom scene is passed.
 *
 * Supports multiple input methods:
 * - **Presets**: Selection of HDRI Haven assets (apartment, city, dawn, forest, lobby, night, park, studio, sunset, warehouse)
 * - **Files**: HDR (.hdr), EXR (.exr), gainmap JPEG (.jpg), gainmap WebP (.webp), or cube faces (array of 6 images)
 * - **Texture**: Pre-existing cube texture via `map` prop
 * - **Custom Scene**: Render children into environment using portal and cube camera
 * - **Ground Projection**: Project environment onto ground plane
 *
 * @remarks
 * - Preset property is NOT meant for production and may fail (relies on CDNs)
 * - Gainmap format has the smallest file footprint
 * - Use `frames={Infinity}` for animated environments with low resolution for performance
 * - Ground projection places models on the "ground" within the environment map
 * - Supports self-hosting with @pmndrs/assets using dynamic imports
 *
 * @example Basic preset usage
 * ```jsx
 * <Environment preset="sunset" />
 * ```
 *
 * @example From HDR file
 * ```jsx
 * <Environment files="/hdr/environment.hdr" />
 * ```
 *
 * @example From gainmap (smallest footprint)
 * ```jsx
 * <Environment files={['file.webp', 'file-gainmap.webp', 'file.json']} />
 * ```
 *
 * @example With self-hosted assets
 * ```jsx
 * import { suspend } from 'suspend-react'
 * const city = import('@pmndrs/assets/hdri/city.exr').then(m => m.default)
 *
 * <Environment files={suspend(city)} />
 * ```
 *
 * @example From existing texture
 * ```jsx
 * <CubeCamera>{(texture) => <Environment map={texture} />}</CubeCamera>
 * ```
 *
 * @example Custom environment scene
 * ```jsx
 * <Environment background near={1} far={1000} resolution={256}>
 *   <mesh scale={100}>
 *     <sphereGeometry args={[1, 64, 64]} />
 *     <meshBasicMaterial map={texture} side={THREE.BackSide} />
 *   </mesh>
 * </Environment>
 * ```
 *
 * @example Animated environment
 * ```jsx
 * <Environment frames={Infinity} resolution={256}>
 *   <Float>
 *     <mesh />
 *   </Float>
 * </Environment>
 * ```
 *
 * @example Mixed custom scene with preset
 * ```jsx
 * <Environment background preset="warehouse">
 *   <mesh />
 * </Environment>
 * ```
 *
 * @example With ground projection
 * ```jsx
 * <Environment ground={{ height: 15, radius: 60 }} preset="city" />
 * ```
 *
 * @example As background only
 * ```jsx
 * <Environment background="only" preset="sunset" />
 * ```
 *
 * @example With rotation and intensity
 * ```jsx
 * <Environment
 *   background
 *   backgroundBlurriness={0.5}
 *   backgroundIntensity={0.8}
 *   backgroundRotation={[0, Math.PI / 2, 0]}
 *   environmentIntensity={1.2}
 *   environmentRotation={[0, Math.PI / 4, 0]}
 *   preset="studio"
 * />
 * ```
 */
export function Environment(props: EnvironmentProps) {
  // Handle color-only background (no files/preset/map)
  if (props.color && !props.files && !props.preset && !props.map) {
    return <EnvironmentColor {...props} />
  }

  // Handle separate background/env files
  if (props.backgroundFiles && props.backgroundFiles !== props.files) {
    return <EnvironmentDualSource {...props} />
  }

  // Existing routing logic
  return props.ground ? (
    <EnvironmentGround {...props} />
  ) : props.map ? (
    <EnvironmentMap {...props} />
  ) : props.children ? (
    <EnvironmentPortal {...props} />
  ) : (
    <EnvironmentCube {...props} />
  )
}
