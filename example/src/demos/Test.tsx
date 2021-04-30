import * as THREE from 'three'
import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'

const material = new THREE.MeshBasicMaterial({ color: 'red' })

function C(props: any) {
  return (
    <mesh {...props}>
      <boxGeometry />
      <primitive attach="material" object={material} />
    </mesh>
  )
}

export default function Test() {
  const [i, set] = useState(true)

  useEffect(() => void setInterval(() => set((s) => !s), 1000), [])

  return (
    <Canvas>
      {i && <C position={[-1, 0, 0]} />}
      <C position={[1, 0, 0]} />
    </Canvas>
  )
}
