import * as THREE from 'three'
import * as React from 'react'
import * as ReactThreeFiber from '../three-types'
import create, { GetState, SetState, UseStore } from 'zustand'
import { prepare, Instance, InstanceProps } from './renderer'
import { DomEvent, EventManager, PointerCaptureTarget, ThreeEvent } from './events'
import { calculateDpr } from './utils'

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

export type Subscription = {
  ref: React.MutableRefObject<RenderCallback>
  priority: number
}

export type Dpr = number | [min: number, max: number]
export type Size = { width: number; height: number }
export type Viewport = Size & {
  initialDpr: number
  dpr: number
  factor: number
  distance: number
  aspect: number
}

export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera
export type Raycaster = THREE.Raycaster & {
  enabled: boolean
  filter?: FilterFunction
  computeOffsets?: ComputeOffsetsFunction
}

export type RenderCallback = (state: RootState, delta: number, frame?: THREE.XRFrame) => void

export type Performance = {
  current: number
  min: number
  max: number
  debounce: number
  regress: () => void
}

export type Renderer = { render: (scene: THREE.Scene, camera: THREE.Camera) => any }

export const isRenderer = (def: any) => !!def?.render
export const isOrthographicCamera = (def: any): def is THREE.OrthographicCamera =>
  def && (def as THREE.OrthographicCamera).isOrthographicCamera

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
  subscribe: (callback: React.MutableRefObject<RenderCallback>, priority?: number) => () => void
}

export type RootState = {
  gl: THREE.WebGLRenderer
  camera: Camera & { manual?: boolean }
  raycaster: Raycaster
  events: EventManager<any>
  xr: { connect: () => void; disconnect: () => void }

  scene: THREE.Scene
  controls: THREE.EventDispatcher | null
  mouse: THREE.Vector2
  clock: THREE.Clock

  linear: boolean
  flat: boolean
  frameloop: 'always' | 'demand' | 'never'
  performance: Performance

  size: Size
  viewport: Viewport & {
    getCurrentViewport: (camera?: Camera, target?: THREE.Vector3, size?: Size) => Omit<Viewport, 'dpr' | 'initialDpr'>
  }

  set: SetState<RootState>
  get: GetState<RootState>
  invalidate: () => void
  advance: (timestamp: number, runGlobalEffects?: boolean) => void
  setSize: (width: number, height: number) => void
  setDpr: (dpr: Dpr) => void
  setFrameloop: (frameloop?: 'always' | 'demand' | 'never') => void
  onPointerMissed?: (event: MouseEvent) => void

  internal: InternalState
}

export type FilterFunction = (items: THREE.Intersection[], state: RootState) => THREE.Intersection[]
export type ComputeOffsetsFunction = (
  event: any,
  state: RootState,
) => { offsetX: number; offsetY: number; width?: number; height?: number }

export type StoreProps = {
  gl: THREE.WebGLRenderer
  size: Size
  shadows?: boolean | Partial<THREE.WebGLShadowMap>
  linear?: boolean
  flat?: boolean
  orthographic?: boolean
  frameloop?: 'always' | 'demand' | 'never'
  performance?: Partial<Omit<Performance, 'regress'>>
  dpr?: Dpr
  raycaster?: Partial<Raycaster>
  camera?: (
    | Camera
    | Partial<
        ReactThreeFiber.Object3DNode<THREE.Camera, typeof THREE.Camera> &
          ReactThreeFiber.Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera> &
          ReactThreeFiber.Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
      >
  ) & { manual?: boolean }
  onPointerMissed?: (event: MouseEvent) => void
}

const context = React.createContext<UseStore<RootState>>(null!)

const createStore = (
  invalidate: (state?: RootState) => void,
  advance: (timestamp: number, runGlobalEffects?: boolean, state?: RootState, frame?: THREE.XRFrame) => void,
): UseStore<RootState> => {
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

    return {
      // Mock objects that have to be configured
      gl: null as unknown as THREE.WebGLRenderer,
      camera: null as unknown as Camera,
      raycaster: null as unknown as Raycaster,
      events: { connected: false },
      xr: null as unknown as { connect: () => void; disconnect: () => void },

      set,
      get,
      invalidate: () => invalidate(get()),
      advance: (timestamp: number, runGlobalEffects?: boolean) => advance(timestamp, runGlobalEffects, get()),

      linear: false,
      flat: false,
      scene: prepare<THREE.Scene>(new THREE.Scene()),

      controls: null,
      clock: new THREE.Clock(),
      mouse: new THREE.Vector2(),

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

        subscribe: (ref: React.MutableRefObject<RenderCallback>, priority = 0) => {
          set(({ internal }) => ({
            internal: {
              ...internal,
              // If this subscription was given a priority, it takes rendering into its own hands
              // For that reason we switch off automatic rendering and increase the manual flag
              // As long as this flag is positive there can be no internal rendering at all
              // because there could be multiple render subscriptions
              priority: internal.priority + (priority > 0 ? 1 : 0),
              // Register subscriber and sort layers from lowest to highest, meaning,
              // highest priority renders last (on top of the other frames)
              subscribers: [...internal.subscribers, { ref, priority }].sort((a, b) => a.priority - b.priority),
            },
          }))
          return () => {
            set(({ internal }) => ({
              internal: {
                ...internal,
                // Decrease manual flag if this subscription had a priority
                priority: internal.priority - (priority > 0 ? 1 : 0),
                // Remove subscriber from list
                subscribers: internal.subscribers.filter((s) => s.ref !== ref),
              },
            }))
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
    const { camera, size, viewport, internal, gl } = rootState.getState()
    if (size !== oldSize || viewport.dpr !== oldDpr) {
      // https://github.com/pmndrs/react-three-fiber/issues/92
      // Do not mess with the camera if it belongs to the user
      if (!camera.manual) {
        if (isOrthographicCamera(camera)) {
          camera.left = size.width / -2
          camera.right = size.width / 2
          camera.top = size.height / 2
          camera.bottom = size.height / -2
        } else {
          camera.aspect = size.width / size.height
        }
        camera.updateProjectionMatrix()
        // https://github.com/pmndrs/react-three-fiber/issues/178
        // Update matrix world since the renderer is a frame late
        camera.updateMatrixWorld()
      }
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
