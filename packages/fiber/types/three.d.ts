import type * as THREE from '#three'
import type { Args, EventHandlers, InstanceProps, ConstructorRepresentation, Overwrite, Mutable } from '#types'

type MutableOrReadonlyParameters<T extends (...args: any) => any> = Parameters<T> | Readonly<Parameters<T>>

export interface MathRepresentation {
  set(...args: number[]): any
}
export interface VectorRepresentation extends MathRepresentation {
  setScalar(value: number): any
}
export type MathTypes = MathRepresentation | THREE.Euler | THREE.Color

export type MathType<T extends MathTypes> = T extends THREE.Color
  ? Args<typeof THREE.Color> | THREE.ColorRepresentation
  : T extends VectorRepresentation | THREE.Layers | THREE.Euler
    ? T | MutableOrReadonlyParameters<T['set']> | number
    : T | MutableOrReadonlyParameters<T['set']>

export type MathProps<P> = {
  [K in keyof P as P[K] extends MathTypes ? K : never]: P[K] extends MathTypes ? MathType<P[K]> : never
}

export type Vector2 = MathType<THREE.Vector2>
export type Vector3 = MathType<THREE.Vector3>
export type Vector4 = MathType<THREE.Vector4>
export type Color = MathType<THREE.Color>
export type Layers = MathType<THREE.Layers>
export type Quaternion = MathType<THREE.Quaternion>
export type Euler = MathType<THREE.Euler>
export type Matrix3 = MathType<THREE.Matrix3>
export type Matrix4 = MathType<THREE.Matrix4>

export interface RaycastableRepresentation {
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void
}
export type EventProps<P> = P extends RaycastableRepresentation ? Partial<EventHandlers> : {}

export interface ReactProps<P> {
  children?: React.ReactNode
  ref?: React.Ref<P>
  key?: React.Key
}

export type ElementProps<T extends ConstructorRepresentation, P = InstanceType<T>> = Partial<
  Overwrite<P, MathProps<P> & ReactProps<P> & EventProps<P>>
>

export type ThreeElement<T extends ConstructorRepresentation> = Mutable<
  Overwrite<ElementProps<T>, Omit<InstanceProps<InstanceType<T>, T>, 'object'>>
>

export type ThreeToJSXElements<T extends Record<string, any>> = {
  [K in keyof T & string as Uncapitalize<K>]: T[K] extends ConstructorRepresentation ? ThreeElement<T[K]> : never
}

type ThreeExports = typeof THREE
type ThreeElementsImpl = ThreeToJSXElements<ThreeExports>

export interface ThreeElements extends Omit<ThreeElementsImpl, 'audio' | 'source' | 'line' | 'path'> {
  primitive: Omit<ThreeElement<any>, 'args'> & { object: object }
  // Conflicts with DOM types can be accessed through a three* prefix
  threeAudio: ThreeElementsImpl['audio']
  threeSource: ThreeElementsImpl['source']
  threeLine: ThreeElementsImpl['line']
  threePath: ThreeElementsImpl['path']
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare module 'react/jsx-dev-runtime' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
