import React, { Suspense, useEffect } from 'react'
import { Canvas } from 'react-three-fiber'
import { useAsset } from 'use-asset'

function Environment() {
  useAsset(() => new Promise((res) => setTimeout(res, 200)), [])
  return null
}

function Discoball() {
  return (
    <group>
      <mesh onPointerUp={() => console.log('up')} castShadow>
        <sphereBufferGeometry args={[1.4, 10, 7]} />
        <meshPhysicalMaterial
          color="black"
          metallness={1}
          roughness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.2}
          flatShading
        />
      </mesh>
    </group>
  )
}

export default function App() {
  return (
    <Canvas
      orthographic
      pixelRatio={[1, 1.5]}
      concurrent
      shadowMap
      camera={{ zoom: 90 }}
      onCreated={(s) => (window.s = s)}
    >
      <Suspense fallback={null}>
        <Environment />
        <Discoball />
      </Suspense>
    </Canvas>
  )
}
