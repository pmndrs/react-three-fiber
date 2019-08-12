/// <reference types="react" />
import * as THREE from 'three'
import { CanvasContext } from './canvas'
export declare type GlobalRenderCallback = (timeStamp: number) => boolean
export interface ObjectHash {
  [name: string]: object
}
export declare function addEffect(callback: GlobalRenderCallback): void
export declare function renderGl(
  state: React.MutableRefObject<CanvasContext>,
  timestamp: number,
  repeat?: number,
  runGlobalEffects?: boolean
): number
export declare function invalidate(state?: React.MutableRefObject<CanvasContext> | boolean, frames?: number): void
export declare const extend: (objects: object) => void
export declare function applyProps(instance: any, newProps: any, oldProps?: any, accumulative?: boolean): void
export declare function render(
  element: React.ReactNode,
  container: THREE.Object3D,
  state?: React.MutableRefObject<CanvasContext>
): any
export declare function unmountComponentAtNode(container: THREE.Object3D): void
export declare function createPortal(
  children: React.ReactNode,
  containerInfo: any,
  implementation: any,
  key?: null
): {
  $$typeof: number | symbol
  key: string | null
  children: import('react').ReactNode
  containerInfo: any
  implementation: any
}
