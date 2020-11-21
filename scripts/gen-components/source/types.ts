import * as React from 'react'
import * as THREE from 'three'

export type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]
export type Overwrite<T, O> = Omit<T, NonFunctionKeys<O>> & O

/**
 * Allows using a TS v4 labeled tuple even with older typescript versions
 */
export type NamedArrayTuple<T extends (...args: any) => any> = Parameters<T>

/**
 * If **T** contains a constructor, @see ConstructorParameters must be used, otherwise **T**.
 */
type Args<T> = T extends new (...args: any) => any ? ConstructorParameters<T> : T

export type Euler = THREE.Euler | Parameters<THREE.Euler['set']>
export type Matrix4 = THREE.Matrix4 | Parameters<THREE.Matrix4['set']>
export type Vector2 = THREE.Vector2 | Parameters<THREE.Vector2['set']>
export type Vector3 = THREE.Vector3 | Parameters<THREE.Vector3['set']>
export type Color = THREE.Color | Parameters<THREE.Color['set']>
export type Layers = THREE.Layers | Parameters<THREE.Layers['set']>
export type Quaternion = THREE.Quaternion | Parameters<THREE.Quaternion['set']>

export interface EventHandlers {
  onClick?: (event: MouseEvent) => void
  onContextMenu?: (event: MouseEvent) => void
  onDoubleClick?: (event: MouseEvent) => void
  onPointerUp?: (event: PointerEvent) => void
  onPointerDown?: (event: PointerEvent) => void
  onPointerOver?: (event: PointerEvent) => void
  onPointerOut?: (event: PointerEvent) => void
  onPointerMove?: (event: PointerEvent) => void
  onWheel?: (event: WheelEvent) => void
}

export interface NodeProps<T, P> {
  /** Attaches this class onto the parent under the given name and nulls it on unmount */
  attach?: string
  /** Appends this class to an array on the parent under the given name and removes it on unmount */
  attachArray?: string
  /** Adds this class to an object on the parent under the given name and deletes it on unmount */
  attachObject?: NamedArrayTuple<(target: string, name: string) => void>
  /** Constructor arguments */
  args?: Args<P>
  children?: React.ReactNode
  ref?: React.Ref<React.ReactNode>
  key?: React.Key
  onUpdate?: (self: T) => void
}

export type Node<T, P> = Overwrite<Partial<T>, NodeProps<T, P>>

export type Object3DNode<T, P> = Overwrite<
  Node<T, P>,
  {
    position?: Vector3
    up?: Vector3
    scale?: Vector3
    rotation?: Euler
    matrix?: Matrix4
    quaternion?: Quaternion
    layers?: Layers
    dispose?: (() => void) | null
  }
> &
  EventHandlers

export type GeometryNode<T extends THREE.Geometry, P> = Overwrite<
  Node<T, P>,
  {
    vertices?: Vector3[]
  }
>

export type MaterialNode<T extends THREE.Material, P> = Overwrite<
  Node<T, P>,
  {
    color?: Color
  }
>

export type LightNode<T extends THREE.Light, P> = Overwrite<
  Object3DNode<T, P>,
  {
    color?: Color
  }
>

export type PrimitiveProps<T extends Record<string, any>> = { object: T } & Partial<T>
export type NewProps<T extends new (...args: any[]) => unknown> = Partial<InstanceType<T>> & {
  object: T
  args: ConstructorParameters<T>
}
