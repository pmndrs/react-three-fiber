import type * as THREE from 'three'
import type { EventHandlers } from './core/events'
import type { InstanceProps, ConstructorRepresentation } from './core/renderer'

type Mutable<P> = { [K in keyof P]: P[K] | Readonly<P[K]> }
type NonFunctionKeys<P> = { [K in keyof P]: P[K] extends Function ? never : K }[keyof P]
type WithoutFunctions<P> = Pick<P, NonFunctionKeys<P>>
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
      : {}
    : {}
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

type NodeProps<T extends Function, P = T['prototype']> = Omit<InstanceProps<T>, 'object'> &
  Partial<ReactProps<P> & MathProps<P> & EventProps<P>>

export type Node<T extends Function> = Mutable<Overwrite<Partial<WithoutFunctions<T['prototype']>>, NodeProps<T>>>

type ThreeExports = typeof THREE
type ThreeElementsImpl = {
  [K in keyof ThreeExports as Uncapitalize<K>]: ThreeExports[K] extends ConstructorRepresentation
    ? Node<ThreeExports[K]>
    : never
}

export interface ThreeElements extends ThreeElementsImpl {
  primitive: Omit<Node<any>, 'args'> & { object: any }
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
