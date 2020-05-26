import React from 'react'
import { linkTo } from '@storybook/addon-links'
import { Canvas, useFrame } from 'react-three-fiber'

import '../.storybook/index.css'

import { OrbitControls } from '../src/OrbitControls'
import * as shapes from '../src/shapes'

export default {
  title: 'Shape',
  component: shapes,
  decorators: [(storyFn) => <Setup>{storyFn()}</Setup>],
}

function Setup({ children }) {
  return (
    <Canvas colorManagement shadowMap camera={{ position: [-5, 5, 5] }} pixelRatio={window.devicePixelRatio}>
      {children}
      <ambientLight intensity={0.8} />
      <pointLight intensity={1} color={'ffffff'} position={[0, 6, 0]} />
      <OrbitControls />
    </Canvas>
  )
}

function Story({ comp, args }) {
  const Comp = shapes[comp]

  const ref = React.useRef()

  // @TODO doesn't seem to work
  useFrame(() => {
    ref.current.rotation.y += 0.01
  })

  return (
    <Comp ref={ref} args={args}>
      <meshPhongMaterial attach="material" color="#f3f3f3" wireframe />
    </Comp>
  )
}

export const Box = () => <Story comp='Box' />
export const Circle = () => <Story comp='Circle' />
export const Cone = () => <Story comp='Cone' />
export const Cylinder = () => <Story comp='Cylinder' />
export const Sphere = () => <Story comp='Sphere' />
export const Plane = () => <Story comp='Plane' />
export const Tube = () => <Story comp='Tube' />
export const Torus = () => <Story comp='Torus' />
export const TorusKnot = () => <Story comp='TorusKnot' />
export const Tetrahedron = () => <Story comp='Tetrahedron' />
export const Ring = () => <Story comp='Ring' />

var verticesOfCube = [-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1]

var indicesOfFaces = [
  2,
  1,
  0,
  0,
  3,
  2,
  0,
  4,
  7,
  7,
  3,
  0,
  0,
  1,
  5,
  5,
  4,
  0,
  1,
  2,
  6,
  6,
  5,
  1,
  2,
  3,
  7,
  7,
  6,
  2,
  4,
  5,
  6,
  6,
  7,
  4,
]

export const Polyhedron = () => <Story comp='Polyhedron' args={[verticesOfCube, indicesOfFaces]} />
export const Icosahedron = () => <Story comp='Icosahedron' />
export const Octahedron = () => <Story comp='Octahedron' />
export const Dodecahedron = () => <Story comp='Dodecahedron' />
export const Extrude = () => <Story comp='Extrude' />
export const Lathe = () => <Story comp='Lathe' />
export const Parametric = () => <Story comp='Parametric' />
