import type * as THREE from 'three'
import type {} from 'react'
import type {} from 'react/jsx-runtime'
import type {} from 'react/jsx-dev-runtime'
import type { Args, EventHandlers, InstanceProps, ConstructorRepresentation } from './core'
import type { Overwrite, Mutable } from './core/utils'

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
  ? T | Parameters<T['set']> | number
  : T | Parameters<T['set']>

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

type ThreeExports = typeof THREE

// Detect conflicts between Three.js and React types.
type DuplicateKeys<T, U> = Extract<keyof T, keyof U>
type Conflicts = DuplicateKeys<JSX.IntrinsicElements, { [K in keyof ThreeExports as Uncapitalize<K>]: any }>

// Create a new type that maps Three.js exports to JSX tags, with conflicts prefixed with 'three'.
type ThreeElementsImpl = {
  [K in keyof ThreeExports as Uncapitalize<K> extends Conflicts
    ? `three${Capitalize<K>}`
    : Uncapitalize<K>]: ThreeExports[K] extends ConstructorRepresentation ? ThreeElement<ThreeExports[K]> : never
}

export interface ThreeElements extends ThreeElementsImpl {
  primitive: Omit<ThreeElement<any>, 'args'> & { object: object }
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
