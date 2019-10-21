import React, { FC } from 'react'
import { ReactThreeFiber } from './three-types'

type Three = typeof import('three')

type DefinedKeys<T extends object> = {
  [K in keyof T]-?: T[K] extends undefined ? never : K
}[keyof T]

type FilterDefined<T extends object> = Pick<T, DefinedKeys<T>>

type ThreeFiberJsx = FilterDefined<
  {
    [P in keyof Three]: Three[P] extends Three['Object3D']
      ? FC<ReactThreeFiber.Object3DNode<InstanceType<Three[P]>, Three[P]>>
      : Three[P] extends Three['Geometry']
      ? FC<ReactThreeFiber.GeometryNode<InstanceType<Three[P]>, Three[P]>>
      : Three[P] extends Three['BufferGeometry']
      ? FC<ReactThreeFiber.BufferGeometryNode<InstanceType<Three[P]>, Three[P]>>
      : Three[P] extends Three['Material']
      ? FC<ReactThreeFiber.MaterialNode<InstanceType<Three[P]>, Required<ConstructorParameters<Three[P]>>>>
      : Three[P] extends new () => any
      ? FC<ReactThreeFiber.Node<InstanceType<Three[P]>, Three[P]>>
      : never
  }
>

const X: ThreeFiberJsx['CircleBufferGeometry'] = 'line' as any

type Y = ThreeFiberJsx['Vector3']

const _ = <X onUpdate={x => console.log(x)} />
