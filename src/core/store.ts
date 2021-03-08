import * as THREE from 'three'
import * as React from 'react'
import * as ReactThreeFiber from '../three-types'
import create, { GetState, SetState, UseStore } from 'zustand'
import shallow from 'zustand/shallow'
import { Instance, InstanceProps } from './renderer'

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

export type Subscription = {
  ref: React.MutableRefObject<RenderCallback>
  priority: number
}

export type PixelRatio = number | [min: number, max: number]
export type Size = { width: number; height: number }
export type Viewport = Size & {
  initialPixelRatio: number
  pixelRatio: number
  factor: number
  distance: number
  aspect: number
}
export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera
export type RenderCallback = (state: RootState, delta: number) => void

export type Performance = {
  current: number
  min: number
  max: number
  debounce: number
  regress: () => void
}

export const isRenderer = (def: THREE.WebGLRenderer): def is THREE.WebGLRenderer =>
  def && !!(def as THREE.WebGLRenderer).render
export const isOrthographicCamera = (def: THREE.Camera): def is THREE.OrthographicCamera =>
  def && (def as THREE.OrthographicCamera).isOrthographicCamera

export type Events = {
  click: EventListenerOrEventListenerObject
  contextmenu: EventListenerOrEventListenerObject
  dblclick: EventListenerOrEventListenerObject
  wheel: EventListenerOrEventListenerObject
  pointerdown: EventListenerOrEventListenerObject
  pointerup: EventListenerOrEventListenerObject
  pointerleave: EventListenerOrEventListenerObject
  pointermove: EventListenerOrEventListenerObject
  lostpointercapture: EventListenerOrEventListenerObject
}

export type RootState = {
  gl: THREE.WebGLRenderer
  scene: THREE.Scene & Instance
  camera: Camera
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  clock: THREE.Clock

  vr: boolean
  noninteractive: boolean
  linear: boolean
  frameloop: boolean
  updateCamera: boolean
  performance: Performance

  size: Size
  viewport: Viewport & {
    getCurrentViewport: (
      camera: Camera,
      target: THREE.Vector3,
      size: Size,
    ) => Omit<Viewport, 'pixelRatio' | 'initialPixelRatio'>
  }

  set: SetState<RootState>
  get: GetState<RootState>
  invalidate: () => void
  setSize: (width: number, height: number) => void
  setCamera: (camera: Camera) => void
  setPixelRatio: (pixelRatio: PixelRatio) => void
  onCreated?: (props: RootState) => void
  onPointerMissed?: () => void

  internal: {
    manual: number
    frames: number
    lastProps: StoreProps
    events: Events

    interaction: THREE.Object3D[]
    subscribers: Subscription[]
    captured: Intersection[] | undefined
    initialClick: [x: number, y: number]
    initialHits: THREE.Object3D[]

    subscribe: (callback: React.MutableRefObject<RenderCallback>, priority?: number) => () => void
  }
}

export type FilterFunction = (items: THREE.Intersection[], state: RootState) => THREE.Intersection[]
export type ComputeOffsetsFunction = (event: any, state: RootState) => { offsetX: number; offsetY: number }

export type StoreProps = {
  gl: THREE.WebGLRenderer
  size: Size
  vr?: boolean
  shadows?: boolean | Partial<THREE.WebGLShadowMap>
  linear?: boolean
  orthographic?: boolean
  noninteractive?: boolean
  updateCamera?: boolean
  frameloop?: boolean
  performance?: Partial<Omit<Performance, 'regress'>>
  pixelRatio?: PixelRatio
  clock?: THREE.Clock,
  raycaster?: Partial<THREE.Raycaster> & { filter?: FilterFunction; computeOffsets?: ComputeOffsetsFunction }
  camera?:
    | Camera
    | Partial<
        ReactThreeFiber.Object3DNode<THREE.Camera, typeof THREE.Camera> &
          ReactThreeFiber.Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera> &
          ReactThreeFiber.Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
      >
  onCreated?: (props: RootState) => void
  onPointerMissed?: () => void
}

const context = React.createContext<UseStore<RootState>>((null as unknown) as UseStore<RootState>)

const createStore = (
  applyProps: (instance: Instance, newProps: InstanceProps, oldProps?: InstanceProps, accumulative?: boolean) => void,
  invalidate: (state?: boolean | RootState, frames?: number) => void,
  props: StoreProps,
): UseStore<RootState> => {
  const {
    gl,
    size,
    vr = false,
    noninteractive = false,
    shadows = false,
    linear = false,
    orthographic = false,

    frameloop = true,
    updateCamera = true,

    pixelRatio = 1,
    performance,
    clock = new THREE.Clock(),
    raycaster: raycastOptions,
    camera: cameraOptions,
    onCreated,
    onPointerMissed,
  } = props

  // Set shadowmap
  if (shadows) {
    gl.shadowMap.enabled = true
    if (typeof shadows === 'object') Object.assign(gl.shadowMap, shadows)
    else gl.shadowMap.type = THREE.PCFSoftShadowMap
  }

  // Set color management
  if (!linear) {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.outputEncoding = THREE.sRGBEncoding
  }

  // Create custom raycaster
  const raycaster = new THREE.Raycaster()
  if (raycastOptions) applyProps(raycaster as any, raycastOptions, {})

  // Create default camera
  const isCamera = cameraOptions instanceof THREE.Camera
  const camera = isCamera
    ? (cameraOptions as Camera)
    : orthographic
    ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
    : new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
  if (!isCamera) {
    camera.position.z = 5
    if (orthographic) camera.zoom = 100
    if (cameraOptions) applyProps(camera as any, cameraOptions as any, {})
    // Always look at center by default
    camera.lookAt(0, 0, 0)
  }

  const scene = (new THREE.Scene() as unknown) as THREE.Scene & Instance
  scene.__r3f = {
    root: {} as UseStore<RootState>,
    objects: [],
  }

  const initialPixelRatio = setPixelRatio(pixelRatio)
  function setPixelRatio(pixelRatio: PixelRatio) {
    return Array.isArray(pixelRatio)
      ? Math.max(Math.min(pixelRatio[0], window.devicePixelRatio), pixelRatio[1])
      : pixelRatio
  }

  const rootState = create<RootState>((set, get) => {
    const position = new THREE.Vector3()
    const defaultTarget = new THREE.Vector3()
    function getCurrentViewport(
      camera: Camera = get().camera,
      target: THREE.Vector3 = defaultTarget,
      size: Size = get().size,
    ) {
      const { width, height } = size
      const aspect = width / height
      const distance = camera.getWorldPosition(position).distanceTo(target)
      if (isOrthographicCamera(camera)) {
        return { width: width / camera.zoom, height: height / camera.zoom, factor: 1, distance, aspect }
      } else {
        const fov = (camera.fov * Math.PI) / 180 // convert vertical fov to radians
        const h = 2 * Math.tan(fov / 2) * distance // visible height
        const w = h * (width / height)
        return { width: w, height: h, factor: width / w, distance, aspect }
      }
    }

    let performanceTimeout: number | undefined = undefined
    const setPerformanceCurrent = (current: number) =>
      set((state) => ({ performance: { ...state.performance, current } }))

    return {
      gl,
      scene,
      camera,
      raycaster,
      clock,
      mouse: new THREE.Vector2(),

      vr,
      noninteractive,
      linear,
      frameloop,
      updateCamera,
      onCreated,
      onPointerMissed,

      performance: {
        current: 1,
        min: 0.5,
        max: 1,
        debounce: 200,
        ...performance,
        regress: () => {
          clearTimeout(performanceTimeout)
          // Set lower bound performance
          setPerformanceCurrent(get().performance.min)
          // Go back to upper bound performance after a while unless something regresses meanwhile
          performanceTimeout = setTimeout(
            () => setPerformanceCurrent(get().performance.max),
            get().performance.debounce,
          )
        },
      },

      size: { width: 0, height: 0 },
      viewport: {
        initialPixelRatio,
        pixelRatio: initialPixelRatio,
        width: 0,
        height: 0,
        aspect: 0,
        distance: 0,
        factor: 0,
        getCurrentViewport,
      },

      set,
      get,
      invalidate: (frames?: number) => invalidate(get(), frames),
      setSize: (width: number, height: number) => {
        const size = { width, height }
        set((state) => ({ size, viewport: { ...state.viewport, ...getCurrentViewport(camera, defaultTarget, size) } }))
      },
      setCamera: (camera: Camera) => set({ camera }),
      setPixelRatio: (pixelRatio: PixelRatio) =>
        set((state) => ({ viewport: { ...state.viewport, pixelRatio: setPixelRatio(pixelRatio) } })),

      internal: {
        manual: 0,
        frames: 0,
        lastProps: props,
        events: (undefined as unknown) as Events,

        interaction: [],
        subscribers: [],
        captured: undefined,
        initialClick: [0, 0],
        initialHits: [],

        subscribe: (ref: React.MutableRefObject<RenderCallback>, priority = 0) => {
          const internal = get().internal
          // If this subscription was given a priority, it takes rendering into its own hands
          // For that reason we switch off automatic rendering and increase the manual flag
          // As long as this flag is positive (there could be multiple render subscription)
          // ..there can be no internal rendering at all
          if (priority) internal.manual++
          // Register subscriber
          internal.subscribers.push({ ref, priority })
          // Sort layers from lowest to highest, meaning, highest priority renders last (on top of the other frames)
          internal.subscribers = internal.subscribers.sort((a, b) => a.priority - b.priority)
          return () => {
            if (internal?.subscribers) {
              // Decrease manual flag if this subscription had a priority
              if (priority) internal.manual--
              internal.subscribers = internal.subscribers.filter((s) => s.ref !== ref)
            }
          }
        },
      },
    }
  })

  // Resize camera and renderer on changes to size and pixelratio
  rootState.subscribe(
    () => {
      const { camera, size, viewport, updateCamera } = rootState.getState()
      // https://github.com/pmndrs/react-three-fiber/issues/92
      // Sometimes automatic default camera adjustment isn't wanted behaviour
      if (updateCamera) {
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
      gl.setPixelRatio(viewport.pixelRatio)
      gl.setSize(size.width, size.height)
    },
    (state) => [state.viewport.pixelRatio, state.size],
    shallow,
  )

  const state = rootState.getState()
  // Update size
  if (size) state.setSize(size.width, size.height)

  // Invalidate on any change
  rootState.subscribe((state) => invalidate(state))

  // Return root state
  return rootState
}

export { createStore, context }
