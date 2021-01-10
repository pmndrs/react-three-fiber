import * as THREE from 'three'
import React, { useEffect, useState } from 'react'
import { Canvas } from 'react-three-fiber'

export default function App() {
  const [a] = useState(
    () => new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color('red') }))
  )

  const [b] = useState(
    () =>
      new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color('green') }))
  )

  const [index, set] = useState(0)
  useEffect(() => void setInterval(() => set((i) => (i + 1) % 2), 1000), [])

  return (
    <Canvas>
      <primitive object={index === 0 ? a : b} />
    </Canvas>
  )
}
