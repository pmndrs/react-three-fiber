/// <reference types="react" />
declare module 'reconciler' {
  export function addEffect(callback: Function): void
  export function renderGl(state: any, timestamp: number, repeat?: number, runGlobalEffects?: boolean): number
  export function invalidate(state: any, frames?: number): void
  export const apply: (objects: any) => any
  export function applyProps(instance: any, newProps: any, oldProps?: {}, container?: any): void
  export function render(element: any, container: any, state: any): any
  export function unmountComponentAtNode(container: any): void
}
declare module 'canvas' {
  import * as THREE from 'three'
  import * as React from 'react'
  export type CanvasContext = {
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
    setDefaultCamera: (camera: THREE.OrthographicCamera | THREE.PerspectiveCamera) => any
    invalidate: () => any
    gl: THREE.WebGLRenderer
    camera: THREE.OrthographicCamera | THREE.PerspectiveCamera
    raycaster: THREE.Raycaster
    mouse: THREE.Vector2
    scene: THREE.Scene
    captured?: THREE.Intersection
    canvas?: HTMLCanvasElement
    canvasRect?: DOMRectReadOnly
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
  export type CanvasProps = {
    children: React.ReactNode
    gl: THREE.WebGLRenderer
    orthographic: THREE.OrthographicCamera | THREE.PerspectiveCamera
    camera?: THREE.OrthographicCamera | THREE.PerspectiveCamera
    raycaster?: THREE.Raycaster
    mouse?: THREE.Vector2
    style?: React.CSSProperties
    pixelRatio?: number
    invalidateFrameloop?: boolean
    vr?: boolean
    onCreated: Function
  }
  export type Measure = [
    {
      ref: React.MutableRefObject<HTMLCanvasElement>
    },
    {
      left: number
      top: number
      width: number
      height: number
    }
  ]
  export type IntersectObject = Event &
    THREE.Intersection & {
      ray: THREE.Raycaster
      stopped: {
        current: boolean
      }
      uuid: string
    }
  export const stateContext: React.Context<CanvasContext>
  export const Canvas: React.MemoExoticComponent<
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
}
declare module 'hooks' {
  import { CanvasContext } from 'canvas'
  type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
  export function useRender(fn: Function, takeOverRenderloop: boolean): void
  export function useThree(): Omit<CanvasContext, 'subscribe'>
  export function useUpdate(
    callback: Function,
    dependents: [],
    optionalRef: React.MutableRefObject<any>
  ): React.MutableRefObject<any>
  export function useResource(optionalRef: React.MutableRefObject<any>): React.MutableRefObject<any>
}
