/// <reference types="react" />
declare module 'reconciler' {
  export function addEffect(callback: Function): void
  export function renderGl(state: any, timestamp: number, repeat?: number, runGlobalEffects?: boolean): number
  export function invalidate(state: any, frames?: number): void
  export const extend: (objects: any) => any
  export function applyProps(instance: any, newProps: any, oldProps?: any, accumulative?: boolean): void
  export function render(element: any, container: any, state: any): any
  export function unmountComponentAtNode(container: any): void
  export function createPortal(
    children: any,
    containerInfo: any,
    implementation: any,
    key?: null
  ): {
    $$typeof: number | symbol
    key: string | null
    children: any
    containerInfo: any
    implementation: any
  }
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
    updateDefaultCamera: boolean
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
  export type CanvasProps = {
    children?: React.ReactNode
    vr?: boolean
    orthographic?: boolean
    invalidateFrameloop?: boolean
    updateDefaultCamera?: boolean
    gl?: object
    camera?: object
    raycaster?: object
    style?: React.CSSProperties
    pixelRatio?: number
    onCreated?: Function
  }
  export type Measure = [
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
      updateDefaultCamera,
      onCreated,
      ...rest
    }: CanvasProps) => JSX.Element
  >
}
declare module 'hooks' {
  import { CanvasContext } from 'canvas'
  type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
  export function useRender(fn: Function, takeOverRenderloop?: boolean, deps?: []): void
  export function useThree(): Omit<CanvasContext, 'subscribe'>
  export function useUpdate(
    callback: Function,
    dependents: [],
    optionalRef?: React.MutableRefObject<any>
  ): React.MutableRefObject<any>
  export function useResource(optionalRef?: React.MutableRefObject<any>): any
}

 declare module 'react-three-fiber' {
    export * from 'reconciler';
    export * from 'canvas';
    export * from 'hooks';
}
