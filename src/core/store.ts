import * as THREE from 'three'
import * as React from 'react'
import create, { SetState, UseStore } from 'zustand'
import shallow from 'zustand/shallow'
import * as ReactThreeFiber from '../three-types'
import { Instance } from './renderer'

// Mock-ups
function applyProps(...args: any) {}
function invalidate(...args: any) {}

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

export type Subscription = {
  ref: React.MutableRefObject<RenderCallback>
  priority: number
}

export type PixelRatio = number | [min: number, max: number]
export type Size = { width: number; height: number }
export type Viewport = Size & { pixelRatio: number; factor: number; distance: number; aspect: number }
export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera
export type RenderCallback = (state: RootState, delta: number) => void

export const isRenderer = (def: THREE.WebGLRenderer): def is THREE.WebGLRenderer =>
  def && !!(def as THREE.WebGLRenderer).render
export const isOrthographicCamera = (def: THREE.Camera): def is THREE.OrthographicCamera =>
  def && (def as THREE.OrthographicCamera).isOrthographicCamera

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

  size: Size
  viewport: Viewport & {
    getCurrentViewport: (camera: Camera, target: THREE.Vector3, size: Size) => Omit<Viewport, 'pixelRatio'>
  }

  invalidate: () => void
  intersect: (event?: any) => void
  setSize: (width: number, height: number) => void
  setCamera: (camera: Camera) => void
  setPixelRatio: (pixelRatio: PixelRatio) => void

  internal: {
    manual: number
    frames: number
    lastProps: StoreProps

    interaction: any[]
    subscribers: Subscription[]
    captured: Intersection[] | undefined
    // [x, y]
    initialClick: [x: number, y: number]
    initialHits: THREE.Object3D[]

    set: SetState<RootState>
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
  pixelRatio?: PixelRatio
  raycaster?: Partial<THREE.Raycaster> & { filter?: FilterFunction; computeOffsets?: ComputeOffsetsFunction }
  camera?: Partial<
    ReactThreeFiber.Object3DNode<THREE.Camera, typeof THREE.Camera> &
      ReactThreeFiber.Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera> &
      ReactThreeFiber.Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
  >
}

const context = React.createContext<UseStore<RootState>>((null as unknown) as UseStore<RootState>)

const createStore = (props: StoreProps): UseStore<RootState> => {
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
    raycaster: raycastOptions,
    camera: cameraOptions,
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
  if (raycastOptions) {
    const { filter, computeOffsets, ...raycasterProps } = raycastOptions
    applyProps(raycaster, raycasterProps, {})
  }

  // Create default camera
  const camera = orthographic
    ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
    : new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
  camera.position.z = 5
  if (cameraOptions) applyProps(camera, cameraOptions, {})
  // Always look at [0, 0, 0]
  camera.lookAt(0, 0, 0)

  const scene = (new THREE.Scene() as unknown) as THREE.Scene & Instance
  scene.__r3f = {
    root: {} as UseStore<RootState>,
    objects: [],
  }

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
      size: Size = get().size
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

    return {
      gl,
      scene,
      camera,
      raycaster,
      mouse: new THREE.Vector2(),
      clock: new THREE.Clock(),

      vr,
      noninteractive,
      linear,
      frameloop,
      updateCamera,

      size: { width: 0, height: 0 },
      viewport: {
        pixelRatio: 1,
        width: 0,
        height: 0,
        aspect: 0,
        distance: 0,
        factor: 0,
        getCurrentViewport,
      },

      invalidate: () => {},
      intersect: (event?: any) => {},
      setSize: (width: number, height: number) => {
        const size = { width, height }
        set((state) => ({ size, viewport: { ...state.viewport, ...getCurrentViewport(camera, defaultTarget, size) } }))
      },
      setCamera: (camera: Camera) => {
        set({ camera })
      },
      setPixelRatio: (pixelRatio: PixelRatio) => {
        set((state) => ({ viewport: { ...state.viewport, pixelRatio: setPixelRatio(pixelRatio) } }))
      },

      internal: {
        manual: 0,
        frames: 0,
        lastProps: props,

        interaction: [],
        subscribers: [],
        captured: undefined,
        initialClick: [0, 0],
        initialHits: [],

        set,
        subscribe: (ref: React.MutableRefObject<RenderCallback>, priority = 0) => {
          const internal = get().internal
          // If this subscription was given a priority, it takes rendering into its own hands
          // For that reason we switch off automatic rendering and increase the manual flag
          // As long as this flag is positive (there could be multiple render subscription)
          // ..there can be no internal rendering at all
          if (priority) internal.manual++

          internal.subscribers.push({ ref, priority: priority })
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
      // Update state model
    },
    (state) => [state.viewport.pixelRatio, state.size],
    shallow
  )

  // Invalidate on any change
  rootState.subscribe(invalidate)

  const state = rootState.getState()

  // Update pixelratio
  if (pixelRatio) state.setPixelRatio(pixelRatio)

  // Update size
  if (size) state.setSize(size.width, size.height)

  // Return root state
  return rootState
}

export { createStore, context }
