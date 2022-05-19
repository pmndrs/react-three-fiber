import React from 'react'
import { Canvas } from '@react-three/fiber'

function Test() {
  return (
    <mesh>
      <torusKnotGeometry />
      <meshBasicMaterial />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <Test />
      <fog near={0.1} far={10} color="green" />
    </Canvas>
  )
}
