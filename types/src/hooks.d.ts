/// <reference types="react" />
import { CanvasContext } from './canvas'
declare type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export declare function useRender(fn: Function, takeOverRenderloop?: boolean, deps?: any[]): void
export declare function useFrame(fn: Function, deps?: any[]): void
export declare function useGl(fn: Function, deps?: any[]): void
export declare function useThree(): Omit<CanvasContext, 'subscribe'>
export declare function useUpdate(
  callback: Function,
  dependents: any[],
  optionalRef?: React.MutableRefObject<any>
): React.MutableRefObject<any>
export declare function useResource(optionalRef?: React.MutableRefObject<any>): any
export {}
