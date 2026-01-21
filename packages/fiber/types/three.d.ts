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

/**
 * Props for geometry transform methods that can be called with `once()`.
 * These methods modify the geometry in-place and only make sense to call once on mount.
 *
 * @example
 * import { once } from '@react-three/fiber'
 *
 * <boxGeometry args={[1, 1, 1]} rotateX={once(Math.PI / 2)} />
 * <planeGeometry args={[10, 10]} translate={once(0, 0, 5)} />
 * <bufferGeometry applyMatrix4={once(matrix)} center={once()} />
 */
export interface GeometryTransformProps {
  /** Rotate the geometry about the X axis (radians). Use with once(). */
  rotateX?: number
  /** Rotate the geometry about the Y axis (radians). Use with once(). */
  rotateY?: number
  /** Rotate the geometry about the Z axis (radians). Use with once(). */
  rotateZ?: number
  /** Translate the geometry (x, y, z). Use with once(). */
  translate?: [x: number, y: number, z: number]
  /** Scale the geometry (x, y, z). Use with once(). */
  scale?: [x: number, y: number, z: number]
  /** Center the geometry based on bounding box. Use with once(). */
  center?: true
  /** Apply a Matrix4 transformation. Use with once(). */
  applyMatrix4?: THREE.Matrix4
  /** Apply a Quaternion rotation. Use with once(). */
  applyQuaternion?: THREE.Quaternion
}

export type GeometryProps<P> = P extends THREE.BufferGeometry ? GeometryTransformProps : {}

export interface ReactProps<P> {
  children?: React.ReactNode
  ref?: React.Ref<P>
  key?: React.Key
}

export type ElementProps<T extends ConstructorRepresentation, P = InstanceType<T>> = Partial<
  Overwrite<P, MathProps<P> & ReactProps<P> & EventProps<P> & GeometryProps<P>>
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
