import type * as THREE from 'three'
import type { UseBoundStore } from 'zustand'
import type { EventHandlers } from './events'
import type { RootState } from './store'

export type AttachFnType<O = any> = (parent: any, self: O) => () => void
export type AttachType<O = any> = string | AttachFnType<O>

type Mutable<T> = { [K in keyof T]: T[K] | Readonly<T[K]> }
type NonFunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
type WithoutFunctions<T> = Pick<T, NonFunctionKeys<T>>
type Overwrite<T, O> = Omit<T, NonFunctionKeys<O>> & O
type ConstructorRepresentation = new (...args: any[]) => any
type Args<T> = T extends ConstructorRepresentation ? ConstructorParameters<T> : any[]

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

export type InstanceProps<T = any, P = T extends Function ? T['prototype'] : {}> = {
  args?: Args<T>
  object?: T
  visible?: boolean
  dispose?: null
  attach?: AttachType<T>
} & Partial<MathProps<P> & EventProps<P>>

export interface Instance<O = any> {
  root: UseBoundStore<RootState>
  type: string
  parent: Instance | null
  children: Instance[]
  props: InstanceProps<O>
  object: O & { __r3f?: Instance<O> }
  eventCount: number
  handlers: Partial<EventHandlers>
  attach?: AttachType<O>
  previousAttach?: any
}

interface ReactProps<T> {
  children?: React.ReactNode
  ref?: React.Ref<T>
  key?: React.Key
}

export type Node<T extends Function> = Mutable<
  Overwrite<Partial<WithoutFunctions<T['prototype']>>, InstanceProps<T> & ReactProps<T['prototype']>>
>

type ThreeExports = typeof THREE
export type ThreeElements = {
  [K in keyof ThreeExports as Uncapitalize<K>]: ThreeExports[K] extends ConstructorRepresentation
    ? Omit<Node<ThreeExports[K]>, 'object'>
    : never
}

export interface Catalogue {
  [name: string]: ConstructorRepresentation
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      primitive: Omit<Node<any>, 'args'>
    }
  }
}
