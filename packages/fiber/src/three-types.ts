import type * as THREE from 'three'
import type { EventHandlers } from './core/events'
import type { InstanceProps, ConstructorRepresentation } from './core/renderer'

type Mutable<T> = { [K in keyof T]: T[K] | Readonly<T[K]> }
type NonFunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
type WithoutFunctions<T> = Pick<T, NonFunctionKeys<T>>
type Overwrite<T, O> = Omit<T, NonFunctionKeys<O>> & O

interface MathRepresentation {
  set(...args: any[]): any
}
interface VectorRepresentation extends MathRepresentation {
  setScalar(s: number): any
}
type MathProps<T> = {
  [K in keyof T]: T[K] extends infer M
    ? M extends THREE.Color
      ? ConstructorParameters<typeof THREE.Color> | THREE.ColorRepresentation
      : M extends MathRepresentation
      ? M extends VectorRepresentation
        ? M | Parameters<M['set']> | Parameters<M['setScalar']>[0]
        : M | Parameters<M['set']>
      : {}
    : never
}

interface RaycastableRepresentation {
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void
}
type EventProps<T> = T extends RaycastableRepresentation ? EventHandlers : {}

interface ReactProps<T> {
  children?: React.ReactNode
  ref?: React.Ref<T>
  key?: React.Key
}

type NodeProps<T extends Function, P = T extends Function ? T['prototype'] : {}> = InstanceProps<T> &
  Partial<ReactProps<P> & MathProps<P> & EventProps<P>>

export type Node<T extends Function> = Mutable<
  Overwrite<Partial<WithoutFunctions<T['prototype']>>, Omit<NodeProps<T>, 'object'>>
>

type ThreeExports = typeof THREE
type ThreeElementsImpl = {
  [K in keyof ThreeExports as Uncapitalize<K>]: ThreeExports[K] extends ConstructorRepresentation
    ? Node<ThreeExports[K]>
    : never
}

export interface ThreeElements extends ThreeElementsImpl {}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      primitive: Omit<NodeProps<any>, 'args'>
    }
  }
}
