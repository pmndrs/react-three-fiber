import type * as React from 'react'
import type * as THREE from 'three'
import type { StoreApi } from 'zustand'
import type { UseBoundStoreWithEqualityFn } from 'zustand/traditional'
import type { DomEvent, EventManager, PointerCaptureTarget, ThreeEvent } from './events'
import type { ThreeCamera } from './utils'
import type { SchedulerApi } from './scheduler'

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
  active: boolean
  priority: number
  frames: number
  subscribe: (callback: React.RefObject<RenderCallback>, priority: number, store: RootStore) => () => void
  /** Internal renderer storage - use state.renderer or state.gl to access */
  actualRenderer: THREE.WebGLRenderer | any // WebGPURenderer when available
  /** Global scheduler reference (for useFrame hook) */
  scheduler: SchedulerApi | null
  /** This root's unique ID in the global scheduler */
  rootId?: string
  /** Function to unregister this root from the global scheduler */
  unregisterRoot?: () => void
  /** Container for child attachment (scene for root, original container for portals) */
  container?: THREE.Object3D
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
  /** (deprecated) The instance of the WebGLrenderer */
  gl: THREE.WebGLRenderer
  /** The instance of the WebGPU renderer, the fallback, OR the default renderer as a mask of gl */
  renderer: THREE.WebGLRenderer | any // WebGPURenderer when available
  /** Inspector of the webGPU Renderer. Init in the canvas */
  inspector: any // Inspector type from three/webgpu

  /** Default camera */
  camera: ThreeCamera
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
  /* Whether to enable r139's THREE.ColorManagement */
  legacy: boolean
  /** Shortcut to gl.outputColorSpace = THREE.LinearSRGBColorSpace */
  linear: boolean
  /** Shortcut to gl.toneMapping = NoTonemapping */
  flat: boolean
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
  invalidate: (frames?: number) => void
  /** Advance (render) one step */
  advance: (timestamp: number, runGlobalEffects?: boolean) => void
  /** Shortcut to setting the event layer */
  setEvents: (events: Partial<EventManager<any>>) => void
  /** Shortcut to manual sizing */
  setSize: (width: number, height: number, top?: number, left?: number) => void
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
