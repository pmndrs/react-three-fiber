import * as THREE from 'three'
import * as React from 'react'
import { type StoreApi } from 'zustand'
import { createWithEqualityFn, type UseBoundStoreWithEqualityFn } from 'zustand/traditional'
import type { DomEvent, EventManager, PointerCaptureTarget, ThreeEvent } from './events'
import { calculateDpr, type Camera, isOrthographicCamera, updateCamera } from './utils'

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

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

export interface Renderer {
  render: (scene: THREE.Scene, camera: THREE.Camera) => any
}
export const isRenderer = (def: any) => !!def?.render

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
}

export interface XRManager {
  connect: () => void
  disconnect: () => void
}

export interface RootState {
  /** Set current state */
  set: StoreApi<RootState>['setState']
  /** Get current state */
  get: StoreApi<RootState>['getState']
  /** The instance of the renderer */
  gl: THREE.WebGLRenderer
  /** Default camera */
  camera: Camera
  /** Default scene */
  scene: THREE.Scene
  /** Default raycaster */
  raycaster: THREE.Raycaster
  /** Default clock */
  clock: THREE.Clock
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
  /** Render loop flags */
  frameloop: Frameloop
  performance: Performance
  /** Reactive pixel-size of the canvas */
  size: Size
  /** Reactive size of the viewport in threejs units */
  viewport: Viewport & {
    getCurrentViewport: (
      camera?: Camera,
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
  /** When the canvas was clicked but nothing was hit */
  onPointerMissed?: (event: MouseEvent) => void
  /** If this state model is layered (via createPortal) then this contains the previous layer */
  previousRoot?: RootStore
  /** Internals */
  internal: InternalState
}

export type RootStore = UseBoundStoreWithEqualityFn<StoreApi<RootState>>

export const context = /* @__PURE__ */ React.createContext<RootStore>(null!)

export const createStore = (
  invalidate: (state?: RootState, frames?: number) => void,
  advance: (timestamp: number, runGlobalEffects?: boolean, state?: RootState, frame?: XRFrame) => void,
): RootStore => {
  const rootStore = createWithEqualityFn<RootState>((set, get) => {
    const position = new THREE.Vector3()
    const defaultTarget = new THREE.Vector3()
    const tempTarget = new THREE.Vector3()
    function getCurrentViewport(
      camera: Camera = get().camera,
      target: THREE.Vector3 | Parameters<THREE.Vector3['set']> = defaultTarget,
      size: Size = get().size,
    ): Omit<Viewport, 'dpr' | 'initialDpr'> {
      const { width, height, top, left } = size
      const aspect = width / height
      if ((target as THREE.Vector3).isVector3) tempTarget.copy(target as THREE.Vector3)
      else tempTarget.set(...(target as Parameters<THREE.Vector3['set']>))
      const distance = camera.getWorldPosition(position).distanceTo(tempTarget)
      if (isOrthographicCamera(camera)) {
        return { width: width / camera.zoom, height: height / camera.zoom, top, left, factor: 1, distance, aspect }
      } else {
        const fov = (camera.fov * Math.PI) / 180 // convert vertical fov to radians
        const h = 2 * Math.tan(fov / 2) * distance // visible height
        const w = h * (width / height)
        return { width: w, height: h, top, left, factor: width / w, distance, aspect }
      }
    }

    let performanceTimeout: ReturnType<typeof setTimeout> | undefined = undefined
    const setPerformanceCurrent = (current: number) =>
      set((state) => ({ performance: { ...state.performance, current } }))

    const pointer = new THREE.Vector2()

    const rootState: RootState = {
      set,
      get,

      // Mock objects that have to be configured
      gl: null as unknown as THREE.WebGLRenderer,
      camera: null as unknown as Camera,
      raycaster: null as unknown as THREE.Raycaster,
      events: { priority: 1, enabled: true, connected: false },
      scene: null as unknown as THREE.Scene,
      xr: null as unknown as XRManager,

      invalidate: (frames = 1) => invalidate(get(), frames),
      advance: (timestamp: number, runGlobalEffects?: boolean) => advance(timestamp, runGlobalEffects, get()),

      legacy: false,
      linear: false,
      flat: false,

      controls: null,
      clock: new THREE.Clock(),
      pointer,
      mouse: pointer,

      frameloop: 'always',
      onPointerMissed: undefined,

      performance: {
        current: 1,
        min: 0.5,
        max: 1,
        debounce: 200,
        regress: () => {
          const state = get()
          // Clear timeout
          if (performanceTimeout) clearTimeout(performanceTimeout)
          // Set lower bound performance
          if (state.performance.current !== state.performance.min) setPerformanceCurrent(state.performance.min)
          // Go back to upper bound performance after a while unless something regresses meanwhile
          performanceTimeout = setTimeout(
            () => setPerformanceCurrent(get().performance.max),
            state.performance.debounce,
          )
        },
      },

      size: { width: 0, height: 0, top: 0, left: 0 },
      viewport: {
        initialDpr: 0,
        dpr: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        aspect: 0,
        distance: 0,
        factor: 0,
        getCurrentViewport,
      },

      setEvents: (events: Partial<EventManager<any>>) =>
        set((state) => ({ ...state, events: { ...state.events, ...events } })),
      setSize: (width: number, height: number, top: number = 0, left: number = 0) => {
        const camera = get().camera
        const size = { width, height, top, left }
        set((state) => ({ size, viewport: { ...state.viewport, ...getCurrentViewport(camera, defaultTarget, size) } }))
      },
      setDpr: (dpr: Dpr) =>
        set((state) => {
          const resolved = calculateDpr(dpr)
          return { viewport: { ...state.viewport, dpr: resolved, initialDpr: state.viewport.initialDpr || resolved } }
        }),
      setFrameloop: (frameloop: Frameloop = 'always') => {
        const clock = get().clock

        // if frameloop === "never" clock.elapsedTime is updated using advance(timestamp)
        clock.stop()
        clock.elapsedTime = 0

        if (frameloop !== 'never') {
          clock.start()
          clock.elapsedTime = 0
        }
        set(() => ({ frameloop }))
      },
      previousRoot: undefined,
      internal: {
        // Events
        interaction: [],
        hovered: new Map<string, ThreeEvent<DomEvent>>(),
        subscribers: [],
        initialClick: [0, 0],
        initialHits: [],
        capturedMap: new Map(),
        lastEvent: React.createRef(),

        // Updates
        active: false,
        frames: 0,
        priority: 0,
        subscribe: (ref: React.RefObject<RenderCallback>, priority: number, store: RootStore) => {
          const internal = get().internal
          // If this subscription was given a priority, it takes rendering into its own hands
          // For that reason we switch off automatic rendering and increase the manual flag
          // As long as this flag is positive there can be no internal rendering at all
          // because there could be multiple render subscriptions
          internal.priority = internal.priority + (priority > 0 ? 1 : 0)
          internal.subscribers.push({ ref, priority, store })
          // Register subscriber and sort layers from lowest to highest, meaning,
          // highest priority renders last (on top of the other frames)
          internal.subscribers = internal.subscribers.sort((a, b) => a.priority - b.priority)
          return () => {
            const internal = get().internal
            if (internal?.subscribers) {
              // Decrease manual flag if this subscription had a priority
              internal.priority = internal.priority - (priority > 0 ? 1 : 0)
              // Remove subscriber from list
              internal.subscribers = internal.subscribers.filter((s) => s.ref !== ref)
            }
          }
        },
      },
    }

    return rootState
  })

  const state = rootStore.getState()

  let oldSize = state.size
  let oldDpr = state.viewport.dpr
  let oldCamera = state.camera
  rootStore.subscribe(() => {
    const { camera, size, viewport, gl, set } = rootStore.getState()

    // Resize camera and renderer on changes to size and pixelratio
    if (size.width !== oldSize.width || size.height !== oldSize.height || viewport.dpr !== oldDpr) {
      oldSize = size
      oldDpr = viewport.dpr
      // Update camera & renderer
      updateCamera(camera, size)
      if (viewport.dpr > 0) gl.setPixelRatio(viewport.dpr)

      const updateStyle = typeof HTMLCanvasElement !== 'undefined' && gl.domElement instanceof HTMLCanvasElement
      gl.setSize(size.width, size.height, updateStyle)
    }

    // Update viewport once the camera changes
    if (camera !== oldCamera) {
      oldCamera = camera
      // Update viewport
      set((state) => ({ viewport: { ...state.viewport, ...state.viewport.getCurrentViewport(camera) } }))
    }
  })

  // Invalidate on any change
  rootStore.subscribe((state) => invalidate(state))

  // Return root state
  return rootStore
}
