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

function makeStory(name, ...args) {
  const Comp = shapes[name]

  return function MyStory() {
    const ref = React.useRef()

    // @TODO doesn't seem to work
    // useFrame(() => {
    //   ref.current.rotation.x += 0.01
    // })

    return (
      <Comp ref={ref} args={args}>
        <meshPhongMaterial attach="material" color="#f3f3f3" wireframe />
      </Comp>
    )
  }
}

export const Box = makeStory('Box')
export const Circle = makeStory('Circle')
export const Cone = makeStory('Cone')
export const Cylinder = makeStory('Cylinder')
export const Sphere = makeStory('Sphere')
export const Plane = makeStory('Plane')
export const Tube = makeStory('Tube')
export const Torus = makeStory('Torus')
export const TorusKnot = makeStory('TorusKnot')
export const Tetrahedron = makeStory('Tetrahedron')
export const Ring = makeStory('Ring')

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

export const Polyhedron = makeStory('Polyhedron', verticesOfCube, indicesOfFaces)
export const Icosahedron = makeStory('Icosahedron')
export const Octahedron = makeStory('Octahedron')
export const Dodecahedron = makeStory('Dodecahedron')
export const Extrude = makeStory('Extrude')
export const Lathe = makeStory('Lathe')
export const Parametric = makeStory('Parametric')
