import * as THREE from 'three'
import * as React from 'react'
export declare type CanvasContext = {
  ready: boolean
  manual: boolean
  vr: boolean
  active: boolean
  invalidateFrameloop: boolean
  frames: number
  aspect: number
  subscribers: Function[]
  subscribe: (callback: Function) => () => any
  setManual: (takeOverRenderloop: boolean) => any
  setDefaultCamera: (camera: THREE.Camera) => any
  invalidate: () => any
  gl?: THREE.WebGLRenderer
  camera: THREE.Camera
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  scene: THREE.Scene
  captured?: THREE.Intersection
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
}
export declare type CanvasProps = {
  children?: React.ReactNode
  vr?: boolean
  orthographic?: boolean
  invalidateFrameloop?: boolean
  gl?: object
  camera?: object
  raycaster?: object
  style?: React.CSSProperties
  pixelRatio?: number
  onCreated?: Function
}
export declare type Measure = [
  {
    ref: React.MutableRefObject<HTMLDivElement | undefined>
  },
  {
    left: number
    top: number
    width: number
    height: number
  }
]
export declare type IntersectObject = Event &
  THREE.Intersection & {
    ray: THREE.Raycaster
    stopped: {
      current: boolean
    }
    uuid: string
  }
export declare const stateContext: React.Context<null>
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
    ...rest
  }: CanvasProps) => JSX.Element
>
