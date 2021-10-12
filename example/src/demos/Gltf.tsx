import * as THREE from 'three'
import React, { Suspense, useState, useEffect } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

function Test() {
  const [url, set] = useState('/Parrot.glb')
  useEffect(() => {
    setTimeout(() => set('/Stork.glb'), 2000)
  }, [])
  const { scene } = useLoader(GLTFLoader, url) as any
  return <primitive object={scene} />
}

export default function App() {
  return (
    <Canvas>
      <ambientLight />
      <Suspense fallback={null}>
        <Test />
      </Suspense>
    </Canvas>
  )
}
