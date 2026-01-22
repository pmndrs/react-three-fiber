import type * as THREE from 'three'
import type { ReactNode } from 'react'
import type { ThreeElement } from './three'
import type { ComputeFunction, EventManager } from './events'
import type { Dpr, Frameloop, Performance, RootState, RootStore, Size } from './store'
import type { Properties, ThreeCamera } from './utils'

//* Base Renderer Types =====================================

// Shim for OffscreenCanvas since it was removed from DOM types
interface OffscreenCanvas extends EventTarget {}

export interface BaseRendererProps {
  canvas: HTMLCanvasElement | OffscreenCanvas
  powerPreference?: 'high-performance' | 'low-power' | 'default'
  antialias?: boolean
  alpha?: boolean
}

export type RendererFactory<TRenderer, TParams> =
  | TRenderer
  | ((defaultProps: TParams) => TRenderer)
  | ((defaultProps: TParams) => Promise<TRenderer>)

export interface Renderer {
  render: (scene: THREE.Scene, camera: THREE.Camera) => any
}

//* WebGL Renderer Props ==============================

export type DefaultGLProps = Omit<THREE.WebGLRendererParameters, 'canvas'> & {
  canvas: HTMLCanvasElement | OffscreenCanvas
}

export type GLProps =
  | Renderer
  | ((defaultProps: DefaultGLProps) => Renderer)
  | ((defaultProps: DefaultGLProps) => Promise<Renderer>)
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>

//* WebGPU Renderer Props ==============================

export type DefaultRendererProps = {
  canvas: HTMLCanvasElement | OffscreenCanvas
  [key: string]: any
}

export type RendererProps =
  | any // WebGPURenderer
  | ((defaultProps: DefaultRendererProps) => any)
  | ((defaultProps: DefaultRendererProps) => Promise<any>)
  | Partial<Properties<any> | Record<string, any>>

//* Camera Props ==============================

export type CameraProps = (
  | THREE.Camera
  | Partial<
      ThreeElement<typeof THREE.Camera> &
        ThreeElement<typeof THREE.PerspectiveCamera> &
        ThreeElement<typeof THREE.OrthographicCamera>
    >
) & {
  /** Flags the camera as manual, putting projection into your own hands */
  manual?: boolean
}

//* Render Props ==============================

export interface RenderProps<TCanvas extends HTMLCanvasElement | OffscreenCanvas> {
  /** A threejs renderer instance or props that go into the default renderer */
  gl?: GLProps
  /** A WebGPU renderer instance or props that go into the default renderer */
  renderer?: RendererProps
  /** Dimensions to fit the renderer to. Will measure canvas dimensions if omitted */
  size?: Size
  /**
   * Enables shadows (by default PCFsoft). Can accept `gl.shadowMap` options for fine-tuning,
   * but also strings: 'basic' | 'percentage' | 'soft' | 'variance'.
   * @see https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap
   */
  shadows?: boolean | 'basic' | 'percentage' | 'soft' | 'variance' | Partial<THREE.WebGLShadowMap>
  /**
   * Disables three r139 color management.
   * @see https://threejs.org/docs/#manual/en/introduction/Color-management
   */
  legacy?: boolean
  /**
   * @deprecated Use `colorSpace` instead. Will be removed in v11.
   * Switch off automatic sRGB encoding and gamma correction
   */
  linear?: boolean
  /**
   * @deprecated Use `toneMapping` instead. Will be removed in v11.
   * Use `THREE.NoToneMapping` instead of `THREE.ACESFilmicToneMapping`
   */
  flat?: boolean
  /** Output color space for the renderer. Defaults to THREE.SRGBColorSpace */
  colorSpace?: THREE.ColorSpace
  /** Tone mapping algorithm. Defaults to THREE.ACESFilmicToneMapping */
  toneMapping?: THREE.ToneMapping
  /** Color space assigned to 8-bit input textures (color maps). Defaults to sRGB. Most textures are authored in sRGB. */
  textureColorSpace?: THREE.ColorSpace
  /** Creates an orthographic camera */
  orthographic?: boolean
  /**
   * R3F's render mode. Set to `demand` to only render on state change or `never` to take control.
   * @see https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance#on-demand-rendering
   */
  frameloop?: Frameloop
  /**
   * R3F performance options for adaptive performance.
   * @see https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance#movement-regression
   */
  performance?: Partial<Omit<Performance, 'regress'>>
  /** Target pixel ratio. Can clamp between a range: `[min, max]` */
  dpr?: Dpr
  /** Props that go into the default raycaster */
  raycaster?: Partial<THREE.Raycaster>
  /** A `THREE.Scene` instance or props that go into the default scene */
  scene?: THREE.Scene | Partial<THREE.Scene>
  /** A `THREE.Camera` instance or props that go into the default camera */
  camera?: CameraProps
  /** An R3F event manager to manage elements' pointer events */
  events?: (store: RootStore) => EventManager<HTMLElement>
  /** Callback after the canvas has rendered (but not yet committed) */
  onCreated?: (state: RootState) => void
  /** Response for pointer clicks that have missed any target */
  onPointerMissed?: (event: MouseEvent) => void
  /** Response for dragover events that have missed any target */
  onDragOverMissed?: (event: DragEvent) => void
  /** Response for drop events that have missed any target */
  onDropMissed?: (event: DragEvent) => void
  /** Whether to automatically update the frustum each frame (default: true) */
  autoUpdateFrustum?: boolean
  /**
   * Enable WebGPU occlusion queries for onOccluded/onVisible events.
   * Auto-enabled when any object uses onOccluded or onVisible handlers.
   * Only works with WebGPU renderer - WebGL will log a warning.
   */
  occlusion?: boolean
  /** Internal: stored size props from Canvas for reset functionality */
  _sizeProps?: { width?: number; height?: number } | null
}

//* Reconciler Root ==============================

export interface ReconcilerRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas> {
  configure: (config?: RenderProps<TCanvas>) => Promise<ReconcilerRoot<TCanvas>>
  render: (element: ReactNode) => RootStore
  unmount: () => void
}

//* Inject State ==============================

export type InjectState = Partial<
  Omit<RootState, 'events'> & {
    events?: {
      enabled?: boolean
      priority?: number
      compute?: ComputeFunction
      connected?: any
    }
    /**
     * When true (default), injects a THREE.Scene between container and children if container isn't already a Scene.
     * This ensures state.scene is always a real THREE.Scene with proper properties (background, environment, fog).
     * Set to false to use the container directly as scene (anti-pattern, but supported for edge cases).
     */
    injectScene?: boolean
  }
>
