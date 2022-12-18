import type * as THREE from 'three'
import type { EventHandlers, InstanceProps, ConstructorRepresentation } from './core'

type Mutable<P> = { [K in keyof P]: P[K] | Readonly<P[K]> }
type NonFunctionKeys<P> = { [K in keyof P]-?: P[K] extends Function ? never : K }[keyof P]
type Overwrite<P, O> = Omit<P, NonFunctionKeys<O>> & O

interface MathRepresentation {
  set(...args: any[]): any
}
interface VectorRepresentation extends MathRepresentation {
  setScalar(s: number): any
}
type MathProps<P> = {
  [K in keyof P]: P[K] extends infer M
    ? M extends THREE.Color
      ? ConstructorParameters<typeof THREE.Color> | THREE.ColorRepresentation
      : M extends MathRepresentation
      ? M extends VectorRepresentation
        ? M | Parameters<M['set']> | Parameters<M['setScalar']>[0]
        : M | Parameters<M['set']>
      : M
    : P[K]
}

interface RaycastableRepresentation {
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void
}
type EventProps<P> = P extends RaycastableRepresentation ? Partial<EventHandlers> : {}

interface ReactProps<P> {
  children?: React.ReactNode
  ref?: React.Ref<P>
  key?: React.Key
}

type ElementProps<T extends ConstructorRepresentation, P = InstanceType<T>> = Partial<
  Overwrite<P, ReactProps<P> & MathProps<P> & EventProps<P>>
>

export type ThreeElement<T extends ConstructorRepresentation> = Mutable<
  Overwrite<ElementProps<T>, Omit<InstanceProps<InstanceType<T>>, 'object'>>
>

type ThreeExports = typeof THREE
type ThreeElementsImpl = {
  [K in keyof ThreeExports as Uncapitalize<K>]: ThreeExports[K] extends ConstructorRepresentation
    ? ThreeElement<ThreeExports[K]>
    : never
}

export interface ThreeElements extends ThreeElementsImpl {
  primitive: Omit<ThreeElement<any>, 'args'> & { object: object }
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
