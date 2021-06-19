import * as THREE from 'three'
import React from 'react'
import { Canvas } from '@react-three/fiber'

const invisibleLayer = new THREE.Layers()
invisibleLayer.set(4)

const visibleLayers = new THREE.Layers()
visibleLayers.enableAll()
visibleLayers.disable(4)

function Box(props: any) {
  return (
    <mesh {...props}>
      <boxGeometry />
    </mesh>
  )
}

function Sphere(props: any) {
  return (
    <mesh {...props}>
      <sphereGeometry args={[0.5, 32, 32]} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas camera={{ layers: visibleLayers }}>
      <Box position={[-0.5, 0, 0]} />
      <Sphere position={[0.5, 0, 0]} layers={invisibleLayer} />
    </Canvas>
  )
}
