import * as THREE from 'three'
import * as React from 'react'
export declare type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera
export declare function isOrthographicCamera(def: THREE.Camera): def is THREE.OrthographicCamera
export declare type DomEvent =
  | React.MouseEvent<HTMLDivElement, MouseEvent>
  | React.WheelEvent<HTMLDivElement>
  | React.PointerEvent<HTMLDivElement>
export declare type Intersection = THREE.Intersection & {
  object: THREE.Object3D
  receivingObject: THREE.Object3D
}
export declare type PointerEvent = DomEvent &
  Intersection & {
    stopped: React.MutableRefObject<boolean>
    unprojectedPoint: THREE.Vector3
    ray: THREE.Ray
    stopPropagation: () => void
    sourceEvent: DomEvent
  }
export declare type IntersectObject = Event &
  Intersection & {
    ray: THREE.Raycaster
    stopped: {
      current: boolean
    }
    uuid: string
  }
export declare type RenderCallback = (props: CanvasContext, timestamp: number) => void
export declare type CanvasContext = {
  ready: boolean
  manual: boolean
  vr: boolean
  active: boolean
  invalidateFrameloop: boolean
  frames: number
  aspect: number
  subscribers: RenderCallback[]
  subscribe: (callback: RenderCallback) => () => void
  setManual: (takeOverRenderloop: boolean) => void
  setDefaultCamera: (camera: Camera) => void
  invalidate: () => void
  intersect: (event?: React.PointerEvent<HTMLDivElement>) => void
  gl?: THREE.WebGLRenderer
  camera: Camera
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  scene: THREE.Scene
  captured?: Intersection[]
  canvas?: HTMLCanvasElement
  canvasRect?: ClientRect | DOMRect
  size?: {
    left: number
    top: number
    width: number
    height: number
  }
  viewport?: {
    width: number
    height: number
    factor: number
  }
  initialClick: [number, number]
}
export declare type CanvasProps = {
  children?: React.ReactNode
  vr?: boolean
  orthographic?: boolean
  invalidateFrameloop?: boolean
  updateDefaultCamera?: boolean
  gl?: Partial<THREE.WebGLRenderer>
  camera?: Partial<THREE.OrthographicCamera & THREE.PerspectiveCamera>
  raycaster?: Partial<THREE.Raycaster>
  style?: React.CSSProperties
  pixelRatio?: number
  onCreated?: (props: CanvasContext) => Promise<any> | void
  onPointerMissed?: () => void
}
export declare type Measure = [
  React.MutableRefObject<HTMLDivElement | null>,
  {
    left: number
    top: number
    width: number
    height: number
  }
]
export declare const stateContext: React.Context<CanvasContext>
export declare const Canvas: React.MemoExoticComponent<
  ({
    children,
    gl,
    camera,
    orthographic,
    raycaster,
    style,
    pixelRatio,
    vr,
    invalidateFrameloop,
    updateDefaultCamera,
    onCreated,
    onPointerMissed,
    ...rest
  }: CanvasProps) => JSX.Element
>
