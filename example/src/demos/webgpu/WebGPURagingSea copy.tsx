import { Canvas, extend, type ThreeToJSXElements, useFrame, type ThreeElements } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import * as THREE from 'three/webgpu'
import { useUniforms, useNodes, useThree } from '@react-three/fiber/webgpu'
import { useControls } from 'leva'
import { getLevaSeaConfig, makeSeaNodes } from './seaNodes'
import { CameraControls, Environment } from '@react-three/drei'
import { Fog } from './Fog'

// single setup of nodes for the app
const Experience = () => {
  //* Leva Controls ==============================
  const levaUniforms = useControls('Raging Sea', getLevaSeaConfig())
  console.log('levaUniforms', levaUniforms)

  //* Apply Uniforms ==============================
  useUniforms(levaUniforms)

  //* Nodes Setup ==============================
  useNodes(({ uniforms }) => {
    console.log('uniforms in useNodes', uniforms)
    // make the sea nodes
    return makeSeaNodes(uniforms)
  }, 'sea')

  return (
    <>
      <Lights />
      <SeaSurface />
      <CameraControls />
    </>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={Math.PI} />
      <directionalLight position={[-4, 2, 0]} intensity={Math.PI} />

      <Environment preset="city" />
      <Fog />
    </>
  )
}

function SeaSurface(props: ThreeElements['mesh']) {
  const matNodes = useNodes('sea')

  const planeGeo = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 2, 256, 256)
    geometry.rotateX(-Math.PI / 2)
    return geometry
  }, [])

  return (
    <mesh geometry={planeGeo} {...props} scale={100}>
      <meshStandardMaterial {...matNodes} color={'#271442'} roughness={0.15} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas renderer camera={{ fov: 50, position: [30, 15, 30] }}>
      <color attach="background" args={['#271442']} />
      <Experience />
    </Canvas>
  )
}
