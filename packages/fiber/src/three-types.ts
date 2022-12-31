import type * as THREE from 'three'
import type { EventHandlers, InstanceProps, ConstructorRepresentation } from './core'
import type { Mutable, Overwrite } from './core/utils'

interface MathRepresentation {
  set(...args: number[]): any
}
interface VectorRepresentation extends MathRepresentation {
  setScalar(s: number): any
}

export type MathType<T extends MathRepresentation> = T extends THREE.Color
  ? ConstructorParameters<typeof THREE.Color> | THREE.ColorRepresentation
  : T extends VectorRepresentation | THREE.Layers
  ? T | Parameters<T['set']> | number
  : T | Parameters<T['set']>

export type Vector2 = MathType<THREE.Vector2>
export type Vector3 = MathType<THREE.Vector3>
export type Vector4 = MathType<THREE.Vector4>
export type Color = MathType<THREE.Color>
export type Layers = MathType<THREE.Layers>
export type Quaternion = MathType<THREE.Quaternion>

type WithMathProps<P> = { [K in keyof P]: P[K] extends MathRepresentation ? MathType<P[K]> : P[K] }

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
  Overwrite<WithMathProps<P>, ReactProps<P> & EventProps<P>>
>

export type ThreeElement<T extends ConstructorRepresentation> = Mutable<
  Overwrite<ElementProps<T>, Omit<InstanceProps<InstanceType<T>, T>, 'object'>>
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
