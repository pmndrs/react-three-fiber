import type * as THREE from 'three'
import type { WebGPURenderer, WebGPURendererParameters } from 'three/webgpu'
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

//* Color Management Config ==============================

/**
 * Color management configuration shared by both WebGL and WebGPU renderers.
 */
export interface ColorManagementConfig {
  /**
   * Color space assigned to 8-bit input textures (color maps).
   * Defaults to sRGB. Most textures are authored in sRGB.
   * @default THREE.SRGBColorSpace
   */
  textureColorSpace?: THREE.ColorSpace
}

//* Renderer Settings ==============================

/**
 * Shadow map setting: `true` uses `THREE.PCFShadowMap`, a string picks a type, an object is assigned
 * to `renderer.shadowMap`.
 *
 * `'soft'` is a deprecated alias of `'percentage'`: both map to `THREE.PCFShadowMap`, because three.js
 * deprecated `PCFSoftShadowMap` and made `PCFShadowMap` soft. Using `'soft'` logs a deprecation notice.
 * @see https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap
 */
export type ShadowsConfig = boolean | 'basic' | 'percentage' | 'soft' | 'variance' | Partial<THREE.WebGLShadowMap>

/**
 * Renderer-wide settings R3F reads from the `renderer` / `gl` props bag. They are not renderer
 * properties: R3F applies them itself, and only on the canvas that owns its renderer.
 */
export interface RendererSettingsConfig extends ColorManagementConfig {
  /**
   * Enables shadows. Only on a renderer R3F builds from a props bag: a renderer instance or factory
   * keeps the `shadowMap` you give it.
   * @example <Canvas renderer={{ shadows: 'variance' }} />
   */
  shadows?: ShadowsConfig
}

//* WebGL Renderer Props ==============================

export type DefaultGLProps = Omit<THREE.WebGLRendererParameters, 'canvas'> & {
  canvas: HTMLCanvasElement | OffscreenCanvas
}

export type GLProps =
  | Renderer
  | ((defaultProps: DefaultGLProps) => Renderer)
  | ((defaultProps: DefaultGLProps) => Promise<Renderer>)
  | (Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters> & RendererSettingsConfig)

//* WebGPU Renderer Props ==============================

export type DefaultRendererProps = {
  canvas: HTMLCanvasElement | OffscreenCanvas
  [key: string]: any
}

/**
 * Canvas-level scheduler configuration.
 * Controls render timing relative to other canvases.
 */
export interface CanvasSchedulerConfig {
  /**
   * Run this Canvas root before the referenced Canvas root id(s).
   */
  before?: string | string[]
  /**
   * Run this Canvas root after the referenced Canvas root id(s).
   */
  after?: string | string[]
  /**
   * Numeric root order. Lower values run first.
   */
  order?: number
  /**
   * Limit this Canvas's default render job (frames per second).
   */
  fps?: number
}

/**
 * The config keys the `renderer` props bag accepts besides the renderer's own parameters and
 * properties. Multi-canvas and scheduling are Canvas props (`primary`, `share`, `scheduler`).
 */
export type RendererConfigExtended = RendererSettingsConfig

/**
 * The `renderer` prop: opt into three's WebGPU renderer.
 * - `true` (the `<Canvas renderer>` shorthand) or `{}`: a default `WebGPURenderer`
 * - a props bag: constructor parameters (`antialias`, `forceWebGL`, ...) and renderer properties
 *   (`toneMapping`, ...), plus `shadows` and `textureColorSpace`
 * - a renderer instance, or a sync/async factory receiving the default props. Structural, like
 *   the `gl` prop: anything with `render()`, so a wrapped or mocked renderer is accepted.
 *
 * Everything here configures a renderer this canvas owns. A canvas sharing a primary's renderer
 * ignores a props bag (with a dev warning): renderer-wide settings come from the `<Canvas primary>`.
 */
export type RendererProps =
  | boolean
  | Renderer
  | ((defaultProps: DefaultRendererProps) => Renderer)
  | ((defaultProps: DefaultRendererProps) => Promise<Renderer>)
  | (Partial<Properties<WebGPURenderer> & WebGPURendererParameters> & RendererConfigExtended)

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
  /**
   * Canvas id. Sets the HTML `id` attribute on the canvas element and the canvas's scheduler root
   * id (so `scheduler={{ after: 'main' }}` can order against it). On a `<Canvas primary>` it is the
   * name other canvases pass to `share="id"`.
   * @example <Canvas id="main-viewer">...</Canvas>
   */
  id?: string
  /**
   * Make this canvas the owner of a WebGPU renderer that other canvases share. Every other WebGPU
   * canvas mounted with or after it borrows its renderer (drawing into its own element through a
   * `CanvasTarget`) unless it passes `share={false}` or its own renderer instance/factory.
   * Renderer-wide settings (`renderer={{ shadows, toneMapping, ... }}`) belong on the primary.
   *
   * WebGPU only: on the root entry `primary` selects WebGPU like the `renderer` prop does. Several
   * primaries need distinct `id`s, and the other canvases then pick one with `share="id"`.
   * Read when the renderer is created; changing it later needs a remount.
   * @example <Canvas primary renderer={{ shadows: true }}>...</Canvas>
   */
  primary?: boolean
  /**
   * Renderer sharing for a non-primary canvas (WebGPU only).
   * - omitted: share the primary's renderer when exactly one `<Canvas primary>` is mounted, else
   *   own a renderer as usual
   * - `"id"`: share the renderer of `<Canvas id="id" primary>`, waiting for it to mount
   * - `false`: always own a renderer, even while a primary exists
   *
   * Read when the renderer is created; changing it later needs a remount.
   * @example <Canvas share="main">...</Canvas>
   */
  share?: string | false
  /**
   * Canvas-level scheduler options: this canvas's order relative to other canvases, and an fps cap
   * for its default render. A canvas sharing a primary's renderer runs after the primary unless
   * `before`/`after` are given here.
   * @example <Canvas scheduler={{ after: 'main', fps: 30 }}>...</Canvas>
   */
  scheduler?: CanvasSchedulerConfig
  /** A threejs renderer instance or props that go into the default renderer */
  gl?: GLProps
  /** A WebGPU renderer instance or props that go into the default renderer */
  renderer?: RendererProps
  /** Dimensions to fit the renderer to. Will measure canvas dimensions if omitted */
  size?: Size
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
  /**
   * Props that go into the default raycaster. `params` is merged into the raycaster's defaults,
   * so a single threshold can be set: `raycaster={{ params: { Points: { threshold: 0.2 } } }}`.
   */
  raycaster?: Partial<Omit<THREE.Raycaster, 'params'>> & { params?: Partial<THREE.RaycasterParameters> }
  /** A `THREE.Scene` instance or props that go into the default scene */
  scene?: THREE.Scene | Partial<THREE.Scene>
  /** A `THREE.Camera` instance or props that go into the default camera */
  camera?: CameraProps
  /** An R3F event manager to manage elements' pointer events */
  events?: (store: RootStore) => EventManager<Element>
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
  /**
   * Internal: the token a Canvas announced `primary` with before this root existed, so configure
   * continues that announcement instead of starting a second one.
   * @internal
   */
  _primaryToken?: object
  /** Force canvas dimensions to even numbers (fixes Safari rendering issues with odd/fractional sizes) */
  forceEven?: boolean
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
