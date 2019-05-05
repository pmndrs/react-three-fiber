import * as THREE from 'three'
import * as React from 'react'
export declare type CanvasContext = {
  canvas?: React.MutableRefObject<any>
  subscribers: Array<Function>
  frames: 0
  aspect: 0
  gl?: THREE.WebGLRenderer
  camera?: THREE.Camera
  scene?: THREE.Scene
  raycaster?: THREE.Raycaster
  canvasRect?: DOMRectReadOnly
  viewport?: {
    width: number
    height: number
  }
  size?: {
    left: number
    top: number
    width: number
    height: number
  }
  ready: boolean
  vr: boolean
  manual: boolean
  active: boolean
  captured: boolean
  invalidateFrameloop: boolean
  subscribe?: (callback: Function, main: any) => () => any
  setManual: (takeOverRenderloop: boolean) => any
  setDefaultCamera: (camera: THREE.Camera) => any
  invalidate: () => any
}
export declare type CanvasProps = {
  children: React.ReactNode
  gl: THREE.WebGLRenderer
  orthographic: THREE.OrthographicCamera | THREE.PerspectiveCamera
  raycaster?: THREE.Raycaster
  mouse?: THREE.Vector2
  camera?: THREE.Camera
  style?: React.CSSProperties
  pixelRatio?: number
  invalidateFrameloop?: boolean
  vr?: boolean
  onCreated: Function
}
export declare type Measure = [
  {
    ref: React.MutableRefObject<any>
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
export declare const stateContext: React.Context<{
  ready: boolean
  subscribers: any[]
  manual: boolean
  vr: boolean
  active: boolean
  canvas: any
  gl: any
  camera: any
  raycaster: any
  mouse: any
  scene: any
  size: any
  canvasRect: any
  frames: number
  aspect: number
  viewport: any
  captured: any
  invalidateFrameloop: boolean
  subscribe: (fn: any) => () => void
  setManual: (takeOverRenderloop: any) => void
  setDefaultCamera: (cam: any) => void
  invalidate: () => void
}>
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
    onCreated,
    ...rest
  }: CanvasProps) => JSX.Element
>
