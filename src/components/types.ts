import * as THREE from 'three'
import { FC } from 'react'
import { OmitByValue } from 'utility-types'

import { ReactThreeFiber } from '../three-types'
import { BufferAttribute } from 'three'

type Three = typeof import('three')

/** Classes exported `three/src/Three.d.ts` but not from `three/src/Three.js` */
type MissingInThreeRuntimeExports =
  | THREE.AnimationAction
  | THREE.DirectGeometry
  | THREE.WebGLClipping
  | THREE.WebGLInfo
  | THREE.WebGLProperties
  | THREE.WebGLRenderList
  | THREE.WebGLRenderLists
  | THREE.WebGLColorBuffer
  | THREE.WebGLDepthBuffer
  | THREE.WebGLStencilBuffer

type InterestingThreeExports = OmitByValue<Three, MissingInThreeRuntimeExports | BufferAttribute>

type __ThreeFiberComponents = {
  [P in keyof InterestingThreeExports]: Three[P] extends new (...args: any) => any
    ? (InstanceType<Three[P]> extends InstanceType<Three['Object3D']>
        ? FC<ReactThreeFiber.Object3DNode<InstanceType<Three[P]>, Three[P]>>
        : InstanceType<Three[P]> extends InstanceType<Three['Geometry']>
        ? FC<ReactThreeFiber.GeometryNode<InstanceType<Three[P]>, Three[P]>>
        : InstanceType<Three[P]> extends InstanceType<Three['BufferGeometry']>
        ? FC<ReactThreeFiber.BufferGeometryNode<InstanceType<Three[P]>, Three[P]>>
        : InstanceType<Three[P]> extends InstanceType<Three['Material']>
        ? FC<ReactThreeFiber.MaterialNode<InstanceType<Three[P]>, Required<ConstructorParameters<Three[P]>>>>
        : FC<ReactThreeFiber.Node<InstanceType<Three[P]>, Three[P]>>)
    : never
}

export { OmitByValue }

export interface ThreeFiberComponents extends OmitByValue<__ThreeFiberComponents, never> {}
