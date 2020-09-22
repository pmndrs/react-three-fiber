import * as THREE from 'three'
import React, { useMemo } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import { Physics, useBox, usePlane, useSphere } from 'use-cannon'
import niceColors from 'nice-color-palettes'

function Plane({ color, ...props }) {
  const [ref] = usePlane(() => ({ ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[1000, 1000]} />
      <meshPhongMaterial attach="material" color={color} />
    </mesh>
  )
}

function Box() {
  const boxSize = [4, 4, 4]
  const [ref, api] = useBox(() => ({ type: 'Kinematic', mass: 1, args: boxSize }))
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    api.position.set(Math.sin(t * 2) * 5, Math.cos(t * 2) * 5, 3)
    api.rotation.set(Math.sin(t * 6), Math.cos(t * 6), 0)
  })
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxBufferGeometry attach="geometry" args={boxSize} />
      <meshLambertMaterial attach="material" color="white" side={THREE.DoubleSide} />
    </mesh>
  )
}

function InstancedSpheres({ number = 100 }) {
  const [ref] = useSphere((index) => ({
    mass: 1,
    position: [Math.random() - 0.5, Math.random() - 0.5, index * 2],
    args: 1,
  }))
  const colors = useMemo(() => {
    const array = new Float32Array(number * 3)
    const color = new THREE.Color()
    for (let i = 0; i < number; i++)
      color
        .set(niceColors[17][Math.floor(Math.random() * 5)])
        .convertSRGBToLinear()
        .toArray(array, i * 3)
    return array
  }, [number])

  return (
    <instancedMesh ref={ref} castShadow receiveShadow args={[null, null, number]}>
      <sphereBufferGeometry attach="geometry" args={[1, 16, 16]}>
        <instancedBufferAttribute attachObject={['attributes', 'color']} args={[colors, 3]} />
      </sphereBufferGeometry>
      <meshPhongMaterial attach="material" vertexColors={THREE.VertexColors} />
    </instancedMesh>
  )
}

export default () => (
  <Canvas concurrent shadowMap sRGB gl={{ alpha: false }} camera={{ position: [0, -12, 16] }}>
    <hemisphereLight intensity={0.35} />
    <spotLight
      position={[30, 0, 30]}
      angle={0.3}
      penumbra={1}
      intensity={2}
      castShadow
      shadow-mapSize-width={256}
      shadow-mapSize-height={256}
    />
    <pointLight position={[-30, 0, -30]} intensity={0.5} />
    <Physics gravity={[0, 0, -30]}>
      <Plane color={niceColors[17][4]} />
      <Plane color={niceColors[17][1]} position={[-6, 0, 0]} rotation={[0, 0.9, 0]} />
      <Plane color={niceColors[17][2]} position={[6, 0, 0]} rotation={[0, -0.9, 0]} />
      <Plane color={niceColors[17][3]} position={[0, 6, 0]} rotation={[0.9, 0, 0]} />
      <Plane color={niceColors[17][0]} position={[0, -6, 0]} rotation={[-0.9, 0, 0]} />
      <Box />
      <InstancedSpheres number={100} />
    </Physics>
  </Canvas>
)
