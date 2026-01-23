import type * as React from 'react'
import type * as THREE from 'three'
import type { WebGPURenderer, CanvasTarget } from 'three/webgpu'
import type { StoreApi } from 'zustand'
import type { UseBoundStoreWithEqualityFn } from 'zustand/traditional'
import type { DomEvent, EventManager, PointerCaptureTarget, ThreeEvent, VisibilityEntry } from './events'
import type { ThreeCamera } from './utils'
import type { SchedulerApi } from './scheduler'

//* Renderer Types ========================================

/** Default renderer type - union of WebGL and WebGPU renderers */
export type R3FRenderer = THREE.WebGLRenderer | WebGPURenderer

//* Core Store Types ========================================

export type Subscription = {
  ref: React.RefObject<RenderCallback>
  priority: number
  store: RootStore
}

export type Dpr = number | [min: number, max: number]

export interface Size {
  width: number
  height: number
  top: number
  left: number
}

export type Frameloop = 'always' | 'demand' | 'never'

export interface Viewport extends Size {
  /** The initial pixel ratio */
  initialDpr: number
  /** Current pixel ratio */
  dpr: number
  /** size.width / viewport.width */
  factor: number
  /** Camera distance */
  distance: number
  /** Camera aspect ratio: width / height */
  aspect: number
}

export type RenderCallback = (state: RootState, delta: number, frame?: XRFrame) => void

export interface Performance {
  /** Current performance normal, between min and max */
  current: number
  /** How low the performance can go, between 0 and max */
  min: number
  /** How high the performance can go, between min and max */
  max: number
  /** Time until current returns to max in ms */
  debounce: number
  /** Sets current to min, puts the system in regression */
  regress: () => void
}

export interface InternalState {
  interaction: THREE.Object3D[]
  hovered: Map<string, ThreeEvent<DomEvent>>
  subscribers: Subscription[]
  capturedMap: Map<number, Map<THREE.Object3D, PointerCaptureTarget>>
  initialClick: [x: number, y: number]
  initialHits: THREE.Object3D[]
  lastEvent: React.RefObject<DomEvent | null>
  /** Visibility event registry (onFramed, onOccluded, onVisible) */
  visibilityRegistry: Map<string, VisibilityEntry>
  /** Whether occlusion queries are enabled (WebGPU only) */
  occlusionEnabled: boolean
  /** Reference to the invisible occlusion observer mesh */
  occlusionObserver: THREE.Mesh | null
  /** Cached occlusion results from render pass - keyed by Object3D */
  occlusionCache: Map<THREE.Object3D, boolean | null>
  /** Internal helper group for R3F system objects (occlusion observer, etc.) */
  helperGroup: THREE.Group | null
  active: boolean
  priority: number
  frames: number
  subscribe: (callback: React.RefObject<RenderCallback>, priority: number, store: RootStore) => () => void
  /** Internal renderer storage - use state.renderer or state.gl to access */
  actualRenderer: R3FRenderer
  /** Global scheduler reference (for useFrame hook) */
  scheduler: SchedulerApi | null
  /** This root's unique ID in the global scheduler */
  rootId?: string
  /** Function to unregister this root from the global scheduler */
  unregisterRoot?: () => void
  /** Container for child attachment (scene for root, original container for portals) */
  container?: THREE.Object3D
  /**
   * CanvasTarget for multi-canvas WebGPU rendering.
   * Created for all WebGPU canvases to support renderer sharing.
   * @see https://threejs.org/docs/#api/en/renderers/common/CanvasTarget
   */
  canvasTarget?: CanvasTarget
  /**
   * Whether multi-canvas rendering is active.
   * True when any canvas uses `target` prop to share a renderer.
   * When true, setCanvasTarget is called before each render.
   */
  isMultiCanvas?: boolean
  /**
   * Whether this canvas is a secondary canvas sharing another's renderer.
   * True when `target` prop is used.
   */
  isSecondary?: boolean
  /**
   * The id of the primary canvas this secondary canvas targets.
   * Only set when isSecondary is true.
   */
  targetId?: string
  /**
   * Function to unregister this primary canvas from the registry.
   * Only set when this canvas has an `id` prop.
   */
  unregisterPrimary?: () => void
  /** Whether canvas dimensions are forced to even numbers */
  forceEven?: boolean
}

export interface XRManager {
  connect: () => void
  disconnect: () => void
}

//* Root State Interface ====================================

export interface RootState {
  /** Set current state */
  set: StoreApi<RootState>['setState']
  /** Get current state */
  get: StoreApi<RootState>['getState']
  /**
   * Reference to the authoritative store for shared TSL resources (uniforms, nodes, etc).
   * - For primary/independent canvases: points to its own store (self-reference)
   * - For secondary canvases: points to the primary canvas's store
   *
   * Hooks like useNodes/useUniforms should read from primaryStore to ensure
   * consistent shared state across all canvases sharing a renderer.
   */
  primaryStore: RootStore
  /** @deprecated Use `renderer` instead. The instance of the renderer (typed as WebGLRenderer for backwards compat) */
  gl: THREE.WebGLRenderer
  /** The renderer instance - type depends on entry point (WebGPU, Legacy, or union for default) */
  renderer: R3FRenderer
  /** Inspector of the webGPU Renderer. Init in the canvas */
  inspector: any // Inspector type from three/webgpu

  /** Default camera */
  camera: ThreeCamera
  /** Camera frustum for visibility checks - auto-updated each frame when autoUpdateFrustum is true */
  frustum: THREE.Frustum
  /** Whether to automatically update the frustum each frame (default: true) */
  autoUpdateFrustum: boolean
  /** Default scene (may be overridden in portals to point to the portal container) */
  scene: THREE.Scene
  /** The actual root THREE.Scene - always points to the true scene, even inside portals */
  rootScene: THREE.Scene
  /** Default raycaster */
  raycaster: THREE.Raycaster
  /** Event layer interface, contains the event handler and the node they're connected to */
  events: EventManager<any>
  /** XR interface */
  xr: XRManager
  /** Currently used controls */
  controls: THREE.EventDispatcher | null
  /** Normalized event coordinates */
  pointer: THREE.Vector2
  /** @deprecated Normalized event coordinates, use "pointer" instead! */
  mouse: THREE.Vector2
  /** Color space assigned to 8-bit input textures (color maps). Most textures are authored in sRGB. */
  textureColorSpace: THREE.ColorSpace
  /** Render loop flags */
  frameloop: Frameloop
  performance: Performance
  /** Reactive pixel-size of the canvas */
  size: Size
  /** Reactive size of the viewport in threejs units */
  viewport: Viewport & {
    getCurrentViewport: (
      camera?: ThreeCamera,
      target?: THREE.Vector3 | Parameters<THREE.Vector3['set']>,
      size?: Size,
    ) => Omit<Viewport, 'dpr' | 'initialDpr'>
  }
  /** Flags the canvas for render, but doesn't render in itself */
  invalidate: (frames?: number, stackFrames?: boolean) => void
  /** Advance (render) one step */
  advance: (timestamp: number, runGlobalEffects?: boolean) => void
  /** Shortcut to setting the event layer */
  setEvents: (events: Partial<EventManager<any>>) => void
  /** Shortcut to manual sizing. No args resets to props/container. Single arg creates square. */
  setSize: (width?: number, height?: number, top?: number, left?: number) => void
  /** Shortcut to manual setting the pixel ratio */
  setDpr: (dpr: Dpr) => void
  /** Shortcut to setting frameloop flags */
  setFrameloop: (frameloop: Frameloop) => void
  /** Set error state to propagate to error boundary */
  setError: (error: Error | null) => void
  /** Current error state (null when no error) */
  error: Error | null
  /** Global TSL uniform nodes - root-level uniforms + scoped sub-objects. Use useUniforms() hook */
  uniforms: UniformStore
  /** Global TSL nodes - root-level nodes + scoped sub-objects. Use useNodes() hook */
  nodes: Record<string, any>
  /** Global TSL texture nodes - use useTextures() hook for operations */
  textures: Map<string, any>
  /** WebGPU PostProcessing instance - use usePostProcessing() hook */
  postProcessing: any | null // THREE.PostProcessing when available
  /** Global TSL pass nodes for post-processing - use usePostProcessing() hook */
  passes: Record<string, any>
  /** Internal version counter for HMR - incremented by rebuildNodes/rebuildUniforms to bust memoization */
  _hmrVersion: number
  /** Internal: whether setSize() has taken ownership of canvas dimensions */
  _sizeImperative: boolean
  /** Internal: stored size props from Canvas for reset functionality */
  _sizeProps: { width?: number; height?: number } | null
  /** When the canvas was clicked but nothing was hit */
  onPointerMissed?: (event: MouseEvent) => void
  /** When a dragover event has missed any target */
  onDragOverMissed?: (event: DragEvent) => void
  /** When a drop event has missed any target */
  onDropMissed?: (event: DragEvent) => void
  /** If this state model is layered (via createPortal) then this contains the previous layer */
  previousRoot?: RootStore
  /** Internals */
  internal: InternalState
  // flags for triggers
  // if we are using the webGl renderer, this will be true
  isLegacy: boolean
  // regardless of renderer, if the system supports webGpu, this will be true
  webGPUSupported: boolean
  //if we are on native
  isNative: boolean
}

export type RootStore = UseBoundStoreWithEqualityFn<StoreApi<RootState>>
