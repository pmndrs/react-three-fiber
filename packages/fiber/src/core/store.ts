import * as THREE from 'three'
import * as React from 'react'
import create, { GetState, SetState, StoreApi, UseBoundStore } from 'zustand'
import { prepare } from './renderer'
import { DomEvent, EventManager, PointerCaptureTarget, ThreeEvent } from './events'
import { calculateDpr, Camera, isOrthographicCamera, updateCamera } from './utils'

// Keys that shouldn't be copied between R3F stores
export const privateKeys = [
  'set',
  'get',
  'setSize',
  'setFrameloop',
  'setDpr',
  'events',
  'invalidate',
  'advance',
  'size',
  'viewport',
] as const

export type PrivateKeys = typeof privateKeys[number]

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

export type Subscription = {
  ref: React.MutableRefObject<RenderCallback>
  priority: number
  store: UseBoundStore<RootState, StoreApi<RootState>>
}

export type Dpr = number | [min: number, max: number]
export type Size = { width: number; height: number }
export type Viewport = Size & {
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

export type RenderCallback = (state: RootState, delta: number, frame?: THREE.XRFrame) => void

export type Performance = {
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

export type Renderer = { render: (scene: THREE.Scene, camera: THREE.Camera) => any }
export const isRenderer = (def: any) => !!def?.render

export type InternalState = {
  active: boolean
  priority: number
  frames: number
  lastEvent: React.MutableRefObject<DomEvent | null>
  interaction: THREE.Object3D[]
  hovered: Map<string, ThreeEvent<DomEvent>>
  subscribers: Subscription[]
  capturedMap: Map<number, Map<THREE.Object3D, PointerCaptureTarget>>
  initialClick: [x: number, y: number]
  initialHits: THREE.Object3D[]
  subscribe: (
    callback: React.MutableRefObject<RenderCallback>,
    priority: number,
    store: UseBoundStore<RootState, StoreApi<RootState>>,
  ) => () => void
}

export type RootState = {
  /** Set current state */
  set: SetState<RootState>
  /** Get current state */
  get: GetState<RootState>
  /** The instance of the renderer */
  gl: THREE.WebGLRenderer
  /** Default camera */
  camera: Camera & { manual?: boolean }
  /** Default scene */
  scene: THREE.Scene
  /** Default raycaster */
  raycaster: THREE.Raycaster
  /** Default clock */
  clock: THREE.Clock
  /** Event layer interface, contains the event handler and the node they're connected to */
  events: EventManager<any>
  /** XR interface */
  xr: { connect: () => void; disconnect: () => void }
  /** Currently used controls */
  controls: THREE.EventDispatcher | null
  /** Normalized event coordinates */
  pointer: THREE.Vector2
  /** @deprecated Normalized event coordinates, use "pointer" instead! */
  mouse: THREE.Vector2
  /* Whether to enable r139's THREE.ColorManagement.legacyMode */
  legacy: boolean
  /** Shortcut to gl.outputEncoding = LinearEncoding */
  linear: boolean
  /** Shortcut to gl.toneMapping = NoTonemapping */
  flat: boolean
  /** Render loop flags */
  frameloop: 'always' | 'demand' | 'never'
  /** Adaptive performance interface */
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
  setSize: (width: number, height: number) => void
  /** Shortcut to manual setting the pixel ratio */
  setDpr: (dpr: Dpr) => void
  /** Shortcut to frameloop flags */
  setFrameloop: (frameloop?: 'always' | 'demand' | 'never') => void
  /** When the canvas was clicked but nothing was hit */
  onPointerMissed?: (event: MouseEvent) => void
  /** If this state model is layerd (via createPortal) then this contains the previous layer */
  previousRoot?: UseBoundStore<RootState, StoreApi<RootState>>
  /** Internals */
  internal: InternalState
}

const context = React.createContext<UseBoundStore<RootState>>(null!)

const createStore = (
  invalidate: (state?: RootState, frames?: number) => void,
  advance: (timestamp: number, runGlobalEffects?: boolean, state?: RootState, frame?: THREE.XRFrame) => void,
): UseBoundStore<RootState> => {
  const rootState = create<RootState>((set, get) => {
    const position = new THREE.Vector3()
    const defaultTarget = new THREE.Vector3()
    const tempTarget = new THREE.Vector3()
    function getCurrentViewport(
      camera: Camera = get().camera,
      target: THREE.Vector3 | Parameters<THREE.Vector3['set']> = defaultTarget,
      size: Size = get().size,
    ) {
      const { width, height } = size
      const aspect = width / height
      if (target instanceof THREE.Vector3) tempTarget.copy(target)
      else tempTarget.set(...target)
      const distance = camera.getWorldPosition(position).distanceTo(tempTarget)
      if (isOrthographicCamera(camera)) {
        return { width: width / camera.zoom, height: height / camera.zoom, factor: 1, distance, aspect }
      } else {
        const fov = (camera.fov * Math.PI) / 180 // convert vertical fov to radians
        const h = 2 * Math.tan(fov / 2) * distance // visible height
        const w = h * (width / height)
        return { width: w, height: h, factor: width / w, distance, aspect }
      }
    }

    let performanceTimeout: ReturnType<typeof setTimeout> | undefined = undefined
    const setPerformanceCurrent = (current: number) =>
      set((state) => ({ performance: { ...state.performance, current } }))

    const pointer = new THREE.Vector2()

    return {
      set,
      get,

      // Mock objects that have to be configured
      gl: null as unknown as THREE.WebGLRenderer,
      camera: null as unknown as Camera,
      raycaster: null as unknown as THREE.Raycaster,
      events: { priority: 1, enabled: true, connected: false },
      xr: null as unknown as { connect: () => void; disconnect: () => void },

      invalidate: (frames = 1) => invalidate(get(), frames),
      advance: (timestamp: number, runGlobalEffects?: boolean) => advance(timestamp, runGlobalEffects, get()),

      legacy: false,
      linear: false,
      flat: false,
      scene: prepare<THREE.Scene>(new THREE.Scene()),

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

      size: { width: 0, height: 0 },
      viewport: {
        initialDpr: 0,
        dpr: 0,
        width: 0,
        height: 0,
        aspect: 0,
        distance: 0,
        factor: 0,
        getCurrentViewport,
      },

      setEvents: (events: Partial<EventManager<any>>) =>
        set((state) => ({ ...state, events: { ...state.events, ...events } })),
      setSize: (width: number, height: number) => {
        const camera = get().camera
        const size = { width, height }
        set((state) => ({ size, viewport: { ...state.viewport, ...getCurrentViewport(camera, defaultTarget, size) } }))
      },
      setDpr: (dpr: Dpr) =>
        set((state) => {
          const resolved = calculateDpr(dpr)
          return { viewport: { ...state.viewport, dpr: resolved, initialDpr: state.viewport.initialDpr || resolved } }
        }),
      setFrameloop: (frameloop: 'always' | 'demand' | 'never' = 'always') => {
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
        active: false,
        priority: 0,
        frames: 0,
        lastEvent: React.createRef(),

        interaction: [],
        hovered: new Map<string, ThreeEvent<DomEvent>>(),
        subscribers: [],
        initialClick: [0, 0],
        initialHits: [],
        capturedMap: new Map(),

        subscribe: (
          ref: React.MutableRefObject<RenderCallback>,
          priority: number,
          store: UseBoundStore<RootState, StoreApi<RootState>>,
        ) => {
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
  })

  const state = rootState.getState()

  // Resize camera and renderer on changes to size and pixelratio
  let oldSize = state.size
  let oldDpr = state.viewport.dpr
  rootState.subscribe(() => {
    const { camera, size, viewport, gl } = rootState.getState()
    if (size !== oldSize || viewport.dpr !== oldDpr) {
      updateCamera(camera, size)
      // Update renderer
      gl.setPixelRatio(viewport.dpr)
      gl.setSize(size.width, size.height)

      oldSize = size
      oldDpr = viewport.dpr
    }
  })

  // Invalidate on any change
  rootState.subscribe((state) => invalidate(state))

  // Return root state
  return rootState
}

export { createStore, context }
