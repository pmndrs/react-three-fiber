import * as THREE from 'three'
import * as React from 'react'
import { type StoreApi } from 'zustand'
import { createWithEqualityFn, type UseBoundStoreWithEqualityFn } from 'zustand/traditional'
import type { DomEvent, EventManager, PointerCaptureTarget, ThreeEvent } from './events'
import { calculateDpr, type Camera, updateCamera } from './utils'
import type { FixedStage, Stage } from './stages'

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

export type RenderCallback = (state: RootState, delta: number, frame?: XRFrame) => void
export type UpdateCallback = RenderCallback

export type LegacyAlways = 'always'
export type FrameloopMode = LegacyAlways | 'auto' | 'demand' | 'never'
export type FrameloopRender = 'auto' | 'manual'
export type FrameloopLegacy = 'always' | 'demand' | 'never'
export type Frameloop = FrameloopLegacy | { mode?: FrameloopMode; render?: FrameloopRender; maxDelta?: number }

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

export type StageTypes = Stage | FixedStage

export interface InternalState {
  container: THREE.Object3D
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
  /** The ordered stages defining the lifecycle. */
  stages: StageTypes[]
  /** Render function flags */
  render: 'auto' | 'manual'
  /** The max delta time between two frames. */
  maxDelta: number
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
  /** Update frame loop flags */
  frameloop: FrameloopLegacy
  /** Adaptive performance interface */
  performance: Performance
  /** The current pixel ratio */
  dpr: number
  /** Reactive pixel-size of the canvas */
  size: Size
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

export const context = React.createContext<RootStore>(null!)

export const createStore = (
  invalidate: (state?: RootState, frames?: number) => void,
  advance: (timestamp: number, runGlobalEffects?: boolean, state?: RootState, frame?: XRFrame) => void,
): RootStore => {
  const rootStore = createWithEqualityFn<RootState>((set, get) => {
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

      dpr: 1,
      size: { width: 0, height: 0, top: 0, left: 0 },

      setEvents: (events: Partial<EventManager<any>>) =>
        set((state) => ({ ...state, events: { ...state.events, ...events } })),
      setSize: (width: number, height: number, top: number = 0, left: number = 0) => {
        set({ size: { width, height, top, left } })
      },
      setDpr: (dpr: Dpr) => set({ dpr: calculateDpr(dpr) }),
      setFrameloop: (frameloop: Frameloop) => {
        const state = get()
        const mode: FrameloopLegacy =
          typeof frameloop === 'string'
            ? frameloop
            : frameloop?.mode === 'auto'
            ? 'always'
            : frameloop?.mode ?? state.frameloop
        const render =
          typeof frameloop === 'string' ? state.internal.render : frameloop?.render ?? state.internal.render
        const maxDelta =
          typeof frameloop === 'string' ? state.internal.maxDelta : frameloop?.maxDelta ?? state.internal.maxDelta

        const clock = state.clock
        // if frameloop === "never" clock.elapsedTime is updated using advance(timestamp)
        clock.stop()
        clock.elapsedTime = 0

        if (frameloop !== 'never') {
          clock.start()
          clock.elapsedTime = 0
        }
        set(() => ({ frameloop: mode, internal: { ...state.internal, render, maxDelta } }))
      },
      previousRoot: undefined,
      internal: {
        container: null as unknown as THREE.Object3D,

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
        stages: [],
        render: 'auto',
        maxDelta: 1 / 10,
        priority: 0,
        subscribe: (ref: React.RefObject<RenderCallback>, priority: number, store: RootStore) => {
          const state = get()
          const internal = state.internal
          // If this subscription was given a priority, it takes rendering into its own hands
          // For that reason we switch off automatic rendering and increase the manual flag
          // As long as this flag is positive there can be no internal rendering at all
          // because there could be multiple render subscriptions
          internal.priority = internal.priority + (priority > 0 ? 1 : 0)
          // We use the render flag and deprecate priority
          if (internal.priority && state.internal.render === 'auto')
            set(() => ({ internal: { ...state.internal, render: 'manual' } }))
          internal.subscribers.push({ ref, priority, store })
          // Register subscriber and sort layers from lowest to highest, meaning,
          // highest priority renders last (on top of the other frames)
          internal.subscribers = internal.subscribers.sort((a, b) => a.priority - b.priority)
          return () => {
            const state = get()
            const internal = state.internal
            if (internal?.subscribers) {
              // Decrease manual flag if this subscription had a priority
              internal.priority = internal.priority - (priority > 0 ? 1 : 0)
              // We use the render flag and deprecate priority
              if (!internal.priority && state.internal.render === 'manual')
                set(() => ({ internal: { ...state.internal, render: 'auto' } }))
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
  let oldDpr = state.dpr
  rootStore.subscribe(({ camera, size, dpr, gl }) => {
    // Resize camera and renderer on changes to size and pixelratio
    if (size !== oldSize || dpr !== oldDpr) {
      oldSize = size
      oldDpr = dpr
      // Update camera & renderer
      updateCamera(camera, size)
      gl.setPixelRatio(dpr)

      const updateStyle = typeof HTMLCanvasElement !== 'undefined' && gl.domElement instanceof HTMLCanvasElement
      gl.setSize(size.width, size.height, updateStyle)
    }
  })

  // Invalidate on any change
  rootStore.subscribe((state) => invalidate(state))

  // Return root state
  return rootStore
}
