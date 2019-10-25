import * as THREE from 'three'
import { FC } from 'react'
import { OmitByValue } from 'utility-types'

import { ReactThreeFiber } from './three-types'

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

// It should be eventually infered from `components`
// I wanted to match JSX.IntrinsicElements declared in three-types
interface ThreeFiberComponents
  extends OmitByValue<
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
    },
    MissingInThreeRuntimeExports | never
  > {}

export const components: ThreeFiberComponents = Object.entries(THREE)
  // Reconciler takes exports from THREE and constructor calls them
  .filter(([_, value]) => typeof value === 'function')
  .map(([key]) => key)
  .concat(['Primitive'])
  // see https://github.com/react-spring/react-three-fiber/issues/172#issuecomment-522887899
  .reduce<Record<string, string>>((acc, key) => {
    acc[key] = `${key[0].toLowerCase()}${key.slice(1)}`
    return acc
  }, {}) as any
