import type * as THREE from 'three'
import type { ReactNode } from 'react'
import type { ThreeElement } from '../src/three-types'
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
  /** Switch off automatic sRGB encoding and gamma correction */
  linear?: boolean
  /** Use `THREE.NoToneMapping` instead of `THREE.ACESFilmicToneMapping` */
  flat?: boolean
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
  }
>
