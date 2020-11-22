import * as React from 'react'
import { Canvas } from 'react-three-fiber'
import { Physics as PhysicsCanon, usePlane, useBox } from 'use-cannon'

const args = [1009, 1000]
const gl = { alpha: false }

function Plane(props) {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={args} />
      <shadowMaterial attach="material" color="#171717" />
    </mesh>
  )
}

function Cube(props) {
  const [ref] = useBox(() => ({ mass: 1, position: [0, 5, 0], rotation: [0.4, 0.2, 0.5], ...props }))
  return (
    <mesh receiveShadow castShadow ref={ref}>
      <boxBufferGeometry attach="geometry" />
      <meshLambertMaterial attach="material" color="hotpink" />
    </mesh>
  )
}

const camera = { position: [-1, 2, 5], fov: 50 }
const colorArgs = ['lightblue']
const spotLightPosition = [10, 10, 10]
const cube1position = [0, 10, -2]
const cube2position = [0, 20, -2]

function Physics() {
  return (
    <Canvas shadowMap gl={gl} camera={camera}>
      <color attach="background" args={colorArgs} />
      <hemisphereLight intensity={0.35} />
      <spotLight position={spotLightPosition} angle={0.3} penumbra={1} intensity={2} castShadow />
      <PhysicsCanon>
        <Plane />
        <Cube />
        <Cube position={cube1position} />
        <Cube position={cube2position} />
      </PhysicsCanon>
    </Canvas>
  )
}

export default React.memo(Physics)
