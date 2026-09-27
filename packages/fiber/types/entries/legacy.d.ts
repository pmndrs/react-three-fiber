/**
 * The `ReactThreeFiber` namespace of the legacy entry: the shared element types plus this entry's JSX map.
 *
 * Explicit aliases, not `export type *`: rollup-dts otherwise re-exports the types as namespace values
 * and the built declaration fails to compile for consumers.
 */
import type * as Common from '../three'
import type { ConstructorRepresentation } from '../reconciler'

export type MutableOrReadonlyParameters<T extends (...args: any) => any> = Common.MutableOrReadonlyParameters<T>
export type MathRepresentation = Common.MathRepresentation
export type VectorRepresentation = Common.VectorRepresentation
export type MathTypes = Common.MathTypes
export type MathType<T extends Common.MathTypes> = Common.MathType<T>
export type MathProps<P> = Common.MathProps<P>
export type Vector2 = Common.Vector2
export type Vector3 = Common.Vector3
export type Vector4 = Common.Vector4
export type Color = Common.Color
export type Layers = Common.Layers
export type Quaternion = Common.Quaternion
export type Euler = Common.Euler
export type Matrix3 = Common.Matrix3
export type Matrix4 = Common.Matrix4
export type RaycastableRepresentation = Common.RaycastableRepresentation
export type EventProps<P> = Common.EventProps<P>
export type GeometryTransformProps = Common.GeometryTransformProps
export type GeometryProps<P> = Common.GeometryProps<P>
export type TSLNodeInput = Common.TSLNodeInput
export type NodeProps<P> = Common.NodeProps<P>
export type ReactProps<P> = Common.ReactProps<P>
export type ElementProps<T extends ConstructorRepresentation, P = InstanceType<T>> = Common.ElementProps<T, P>
export type ThreeElement<T extends ConstructorRepresentation> = Common.ThreeElement<T>
export type ThreeToJSXElements<T extends Record<string, any>> = Common.ThreeToJSXElements<T>
export type Object3DMethod = Common.Object3DMethod
export type ThreeElementsOf<T extends Record<string, any>> = Common.ThreeElementsOf<T>
export type ElementOf<E, K extends string> = Common.ElementOf<E, K>

export type { ThreeElements, ThreeExports } from '../../src/legacy'
