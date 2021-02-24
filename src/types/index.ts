import * as THREE from 'three'
import { TinyEmitter } from 'tiny-emitter'
import { RectReadOnly, Options as ResizeOptions } from 'react-use-measure'
import Reconciler from 'react-reconciler'
import { StoreApi } from 'zustand'

import { NamedArrayTuple } from '../three-types'
import { ReactThreeFiber } from '../index'

import { Camera, ThreeEvent, Intersection, DomEvent, ThreeScene } from './internal'

export type ObjectMap = {
  nodes: { [name: string]: THREE.Object3D }
  materials: { [name: string]: THREE.Material }
}

export type SharedCanvasContext = {
  gl: THREE.WebGLRenderer
  aspect: number
  subscribe: (callback: React.MutableRefObject<RenderCallback>, priority?: number) => () => void
  setDefaultCamera: (camera: Camera) => void
  invalidate: () => void
  intersect: (event?: DomEvent) => void
  camera: THREE.Camera
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  clock: THREE.Clock
  scene: ThreeScene
  viewport: Viewport
  events: DomEventHandlers
}

export type PointerEvent = ThreeEvent<React.PointerEvent>
export type MouseEvent = ThreeEvent<React.MouseEvent>
export type WheelEvent = ThreeEvent<React.WheelEvent>

export type RenderCallback = (state: CanvasContext, delta: number) => void

export type Viewport = { width: number; height: number; factor: number; distance: number }
export type ViewportData = Viewport & ((camera: Camera, target: THREE.Vector3) => Viewport)

export type Subscription = {
  ref: React.MutableRefObject<RenderCallback>
  priority: number
}

export type CanvasContext = SharedCanvasContext & {
  captured: Intersection[] | undefined
  noEvents: boolean
  ready: boolean
  active: boolean
  manual: number
  colorManagement: boolean
  vr: boolean
  concurrent: boolean
  invalidateFrameloop: boolean
  frames: number
  subscribers: Subscription[]
  initialClick: NamedArrayTuple<(x: number, y: number) => void>
  initialHits: THREE.Object3D[]
  pointer: TinyEmitter
}

export type FilterFunction = (items: THREE.Intersection[], state: SharedCanvasContext) => THREE.Intersection[]
export type ComputeOffsetsFunction = (
  event: DomEvent,
  state: SharedCanvasContext
) => { offsetX: number; offsetY: number }

type NewType<TClass> = new () => TClass

export interface CanvasProps {
  children: React.ReactNode
  vr?: boolean
  renderer?: NewType<THREE.WebGL1Renderer> | NewType<THREE.WebGLRenderer>
  concurrent?: boolean
  shadowMap?: boolean | Partial<THREE.WebGLShadowMap>
  colorManagement?: boolean
  orthographic?: boolean
  resize?: ResizeOptions
  invalidateFrameloop?: boolean
  updateDefaultCamera?: boolean
  noEvents?: boolean
  gl?: Partial<THREE.WebGLRendererParameters>
  camera?: Partial<
    ReactThreeFiber.Object3DNode<THREE.Camera, typeof THREE.Camera> &
      ReactThreeFiber.Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera> &
      ReactThreeFiber.Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
  >
  raycaster?: Partial<THREE.Raycaster> & { filter?: FilterFunction; computeOffsets?: ComputeOffsetsFunction }
  pixelRatio?: number | [number, number]
  onCreated?: (props: CanvasContext) => Promise<any> | void
  onPointerMissed?: () => void
}

export interface UseCanvasProps extends CanvasProps {
  gl: THREE.WebGLRenderer
  size: RectReadOnly
  forceResize: () => void
}

export type DomEventHandlers = {
  /**
   * I'd like to give these actual
   * types instead of any - Josh
   */
  onClick(e: any): void
  onContextMenu(e: any): void
  onDoubleClick(e: any): void
  onWheel(e: any): void
  onPointerDown(e: any): void
  onPointerUp(e: any): void
  onPointerLeave(e: any): void
  onPointerMove(e: any): void
  onGotPointerCaptureLegacy(e: any): void
  onLostPointerCapture(e: any): void
}

export type Store = CanvasContext & { root: Reconciler.FiberRoot }

export type RootsValue = StoreApi<Store>

export type ReactThreeFiberContainer<T> = T & {
  __state: Omit<CanvasProps, 'children'> | undefined
}
