import * as THREE from 'three'
import React, { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useThree, useLoader, useFrame, invalidate, useUpdate } from 'react-three-fiber'

const Cube = () => {
  const texture = useLoader(
    THREE.TextureLoader,
    'http://jaanga.github.io/moon/heightmaps/WAC_GLD100_E000N1800_004P-1024x512.png'
  )

  const [show, set] = useState(true)
  useEffect(() => void setTimeout(() => set(false), 1000), [])

  const ref = useUpdate(mesh => {
    console.log(mesh.material)
    mesh.material.needsUpdate = true
  })

  return (
    <mesh ref={ref}>
      <boxBufferGeometry attach="geometry" />
      <meshBasicMaterial attach="material" map={show ? texture : null} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <Suspense fallback={null}>
        <Cube />
      </Suspense>
    </Canvas>
  )
}
