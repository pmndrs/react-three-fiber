import * as THREE from 'three'
import * as React from 'react'
import * as ReactThreeFiber from '../three-types'
import create, { GetState, SetState, UseStore } from 'zustand'
import { prepare, Instance, InstanceProps } from './renderer'
import { DomEvent, EventManager, PointerCaptureTarget, ThreeEvent } from './events'

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

export type RenderCallback = (state: RootState, delta: number) => void

export type Performance = {
  current: number
  min: number
  max: number
  debounce: number
  regress: () => void
}

export type Renderer = { render: (scene: THREE.Scene, camera: THREE.Camera) => any }

export const isRenderer = (def: Renderer) => !!def?.render
export const isOrthographicCamera = (def: THREE.Camera): def is THREE.OrthographicCamera =>
  def && (def as THREE.OrthographicCamera).isOrthographicCamera

export type InternalState = {
  active: boolean
  priority: number
  frames: number
  lastProps: StoreProps
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
  scene: THREE.Scene
  camera: Camera & { manual?: boolean }
  controls: THREE.EventDispatcher | null
  raycaster: Raycaster
  mouse: THREE.Vector2
  clock: THREE.Clock

  vr: boolean
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

  events: EventManager<any>
  internal: InternalState
}

export type FilterFunction = (items: THREE.Intersection[], state: RootState) => THREE.Intersection[]
export type ComputeOffsetsFunction = (event: any, state: RootState) => { offsetX: number; offsetY: number }

export type StoreProps = {
  gl: THREE.WebGLRenderer
  size: Size
  vr?: boolean
  shadows?: boolean | Partial<THREE.WebGLShadowMap>
  linear?: boolean
  flat?: boolean
  orthographic?: boolean
  frameloop?: 'always' | 'demand' | 'never'
  performance?: Partial<Omit<Performance, 'regress'>>
  dpr?: Dpr
  clock?: THREE.Clock
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

export type ApplyProps = (instance: Instance, newProps: InstanceProps) => void

export function calculateDpr(dpr: Dpr) {
  return Array.isArray(dpr) ? Math.min(Math.max(dpr[0], window.devicePixelRatio), dpr[1]) : dpr
}

const context = React.createContext<UseStore<RootState>>(null!)

const createStore = (
  applyProps: ApplyProps,
  invalidate: (state?: RootState) => void,
  advance: (timestamp: number, runGlobalEffects?: boolean, state?: RootState) => void,
  props: StoreProps,
): UseStore<RootState> => {
  const {
    gl,
    size,
    shadows = false,
    linear = false,
    flat = false,
    vr = false,
    orthographic = false,
    frameloop = 'always',
    dpr = 1,
    performance,
    clock = new THREE.Clock(),
    raycaster: raycastOptions,
    camera: cameraOptions,
    onPointerMissed,
  } = props

  // Set shadowmap
  if (shadows) {
    gl.shadowMap.enabled = true
    if (typeof shadows === 'object') Object.assign(gl.shadowMap, shadows)
    else gl.shadowMap.type = THREE.PCFSoftShadowMap
  }

  // Set color preferences
  if (linear) gl.outputEncoding = THREE.LinearEncoding
  if (flat) gl.toneMapping = THREE.NoToneMapping

  // clock.elapsedTime is updated using advance(timestamp)
  if (frameloop === 'never') {
    clock.stop()
    clock.elapsedTime = 0
  }

  const rootState = create<RootState>((set, get) => {
    // Create custom raycaster
    const raycaster = new THREE.Raycaster() as Raycaster
    const { params, ...options } = raycastOptions || {}
    applyProps(raycaster as any, { enabled: true, ...options, params: { ...raycaster.params, ...params } })

    // Create default camera
    const isCamera = cameraOptions instanceof THREE.Camera
    const camera = isCamera
      ? (cameraOptions as Camera)
      : orthographic
      ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
      : new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
    if (!isCamera) {
      camera.position.z = 5
      if (cameraOptions) applyProps(camera as any, cameraOptions as any)
      // Always look at center by default
      if (!cameraOptions?.rotation) camera.lookAt(0, 0, 0)
    }

    const initialDpr = calculateDpr(dpr)

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
      gl,

      set,
      get,
      invalidate: () => invalidate(get()),
      advance: (timestamp: number, runGlobalEffects?: boolean) => advance(timestamp, runGlobalEffects, get()),

      linear,
      flat,
      scene: prepare<THREE.Scene>(new THREE.Scene()),
      camera,
      controls: null,
      raycaster,
      clock,
      mouse: new THREE.Vector2(),

      vr,
      frameloop,
      onPointerMissed,

      performance: {
        current: 1,
        min: 0.5,
        max: 1,
        debounce: 200,
        ...performance,
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
        initialDpr,
        dpr: initialDpr,
        width: 0,
        height: 0,
        aspect: 0,
        distance: 0,
        factor: 0,
        getCurrentViewport,
      },

      setSize: (width: number, height: number) => {
        const size = { width, height }
        set((state) => ({ size, viewport: { ...state.viewport, ...getCurrentViewport(camera, defaultTarget, size) } }))
      },
      setDpr: (dpr: Dpr) => set((state) => ({ viewport: { ...state.viewport, dpr: calculateDpr(dpr) } })),

      setFrameloop: (frameloop: 'always' | 'demand' | 'never' = 'always') => set(() => ({ frameloop })),

      events: { connected: false },
      internal: {
        active: false,
        priority: 0,
        frames: 0,
        lastProps: props,
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
    const { camera, size, viewport, internal } = rootState.getState()
    if (size !== oldSize || viewport.dpr !== oldDpr) {
      // https://github.com/pmndrs/react-three-fiber/issues/92
      // Do not mess with the camera if it belongs to the user
      if (!camera.manual && !(internal.lastProps.camera instanceof THREE.Camera)) {
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

  // Update size
  if (size) state.setSize(size.width, size.height)

  // Invalidate on any change
  rootState.subscribe((state) => invalidate(state))

  // Return root state
  return rootState
}

export { createStore, context }
