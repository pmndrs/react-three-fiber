import THREE from 'three'
import { FC } from 'react'
import { ReactThreeFiber } from './three-types'

type Three = typeof import('three')

type DefinedKeys<T extends object> = {
  [K in keyof T]-?: T[K] extends undefined ? never : K
}[keyof T]

type FilterDefined<T extends object> = Pick<T, DefinedKeys<T>>

interface ThreeFiberComponents
  extends FilterDefined<
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
  > {}

export const components: ThreeFiberComponents = Object.entries(THREE)
  // Reconciler takes exports from THREE and constructor calls them
  .filter(([_, value]) => typeof value === 'function' && value.prototype)
  .map(([key]) => key)
  .concat(['Primitive'])
  .reduce<Record<string, string>>((acc, key) => {
    acc[key] = `${key[0].toLowerCase()}${key.slice(1)}`
    return acc
  }, {}) as any
