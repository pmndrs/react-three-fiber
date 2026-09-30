import type * as THREE from 'three'
import type { Args, EventHandlers, InstanceProps, ConstructorRepresentation, Overwrite, Mutable } from '#types'

export type MutableOrReadonlyParameters<T extends (...args: any) => any> = Parameters<T> | Readonly<Parameters<T>>

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

/**
 * Workaround for @types/three TSL node type issues.
 * The Node base class has properties that subclasses (OperatorNode, ConstNode, etc.) don't inherit.
 * This transforms `Node | null` properties to accept any object with node-like shape.
 */
export type TSLNodeInput = { nodeType?: string | null; uuid?: string } | null

/**
 * For node material properties (colorNode, positionNode, etc.), accept broader types
 * since @types/three has broken inheritance for TSL node subclasses. NodeClass requires
 * `nodeType`, so this structural key test remains neutral to the selected Three entry.
 */
export type NodeProps<P> = {
  [K in keyof P as NonNullable<P[K]> extends { nodeType: string | null } ? K : never]?: TSLNodeInput
}

export interface ReactProps<P> {
  children?: React.ReactNode
  ref?: React.Ref<P>
  key?: React.Key
}

export type ElementProps<T extends ConstructorRepresentation, P = InstanceType<T>> = Partial<
  Overwrite<P, MathProps<P> & ReactProps<P> & EventProps<P> & GeometryProps<P> & NodeProps<P>>
>

export type ThreeElement<T extends ConstructorRepresentation> = Mutable<
  Overwrite<ElementProps<T>, Omit<InstanceProps<InstanceType<T>, T>, 'object'>>
>

/**
 * Every constructor export of a three namespace as an uncapitalized JSX element. Non-constructor
 * exports (constants, functions, nested namespaces) are dropped from the keys rather than mapped
 * to `never`: a single `never`-valued key in `JSX.IntrinsicElements` collapses the props of any
 * tag typed `React.ElementType` (#3898).
 */
export type ThreeToJSXElements<T extends Record<string, any>> = {
  [K in keyof T & string as T[K] extends ConstructorRepresentation ? Uncapitalize<K> : never]: ThreeElement<T[K]>
}

/** Method names of Object3D, excluded from the `primitive` element's typed props. */
export type Object3DMethod = NonNullable<
  {
    [K in keyof THREE.Object3D]-?: THREE.Object3D[K] extends (...args: any[]) => any ? K : never
  }[keyof THREE.Object3D]
>

/** Look up a key present in a generic element map. */
export type ElementOf<E, K extends string> = E[Extract<keyof E, K>]

/**
 * The JSX element map derived from an entry's Three.js exports. Each entry declares its own
 * `ThreeElements` from this (`src/index.tsx`, `src/legacy.tsx`, `src/webgpu/index.tsx`) and augments
 * react's `IntrinsicElements` with it, so `/legacy` never advertises node materials and `/webgpu`
 * never advertises a `<webGLRenderer>`.
 */
export type ThreeElementsOf<T extends Record<string, any>> = Omit<
  ThreeToJSXElements<T>,
  'audio' | 'source' | 'line' | 'path'
> & {
  /**
   * `primitive` wraps a pre-existing object, so its props cannot be derived from one class.
   * Events are typed from `EventHandlers` (`onClick={(e) => ...}` infers `e`), the ref is
   * untyped, and any other prop is accepted and applied to the object by name. Object3D's own
   * methods are left out of the typed surface: they return `this`, so a subclass element's
   * props (`ThreeElements['group']`) could not be spread onto a primitive otherwise.
   */
  primitive: Omit<ThreeElement<typeof THREE.Object3D>, 'args' | 'object' | 'ref' | Object3DMethod> & {
    object: object
    ref?: React.Ref<any>
    [prop: string]: unknown
  }
  // Conflicts with DOM types can be accessed through a three* prefix
  threeAudio: ElementOf<ThreeToJSXElements<T>, 'audio'>
  threeSource: ElementOf<ThreeToJSXElements<T>, 'source'>
  threeLine: ElementOf<ThreeToJSXElements<T>, 'line'>
  threePath: ElementOf<ThreeToJSXElements<T>, 'path'>
}
