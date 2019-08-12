/// <reference types="react" />
import { CanvasContext, RenderCallback } from './canvas'
declare type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export declare function useRender(fn: RenderCallback, takeOverRenderloop?: boolean, deps?: any[]): void
export declare function useFrame(fn: RenderCallback, deps?: any[]): void
export declare function useGl(fn: RenderCallback, deps?: any[]): void
export declare function useThree(): Omit<CanvasContext, 'subscribe'>
export declare function useUpdate<T>(
  callback: (props: T) => void,
  dependents: any[],
  optionalRef?: React.MutableRefObject<T>
): React.MutableRefObject<any>
export declare function useResource<T>(optionalRef?: React.MutableRefObject<T>): [React.MutableRefObject<T>, T]
export {}
