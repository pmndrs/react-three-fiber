import { Canvas, extend, type ThreeToJSXElements, useFrame, type ThreeElements } from '@react-three/fiber'
import { easing } from 'maath'
import { useMemo, useState } from 'react'
import { color, mix, positionLocal, sin, time, uniform, vec2, vec3 } from 'three/tsl'
import * as THREE from 'three/webgpu'
import { useUniforms, useNodes, useUniform } from '@react-three/fiber/webgpu'
import { Fn } from 'three/tsl'
import type { UniformNode } from '@react-three/fiber/webgpu'
import { useLocalNodes } from '@react-three/fiber/src/webgpu/hooks/useNodes'
import { useControls } from 'leva'
import { getLevaSeaConfig, makeSeaNodes } from './seaNodes'
import { CameraControls, OrbitControls } from '@react-three/drei'

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
      <OrbitControls />
    </>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={Math.PI} />
      <directionalLight position={[-4, 2, 0]} intensity={Math.PI} />
    </>
  )
}

function SeaSurface(props: ThreeElements['mesh']) {
  const [hovered, hover] = useState(false)

  const matNodes = useNodes('sea')

  return (
    <mesh onPointerOver={() => hover(true)} onPointerOut={() => hover(false)} {...props}>
      <planeGeometry rotateX={Math.PI / 2} />
      <meshStandardMaterial {...matNodes} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas renderer>
      <Experience />
    </Canvas>
  )
}
