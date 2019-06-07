import * as THREE from 'three/src/Three'
import React, { useState, useEffect, useMemo } from 'react'
import { Canvas } from 'react-three-fiber'

function Test() {
  const [mesh] = useState(() => {
    const mat = new THREE.MeshBasicMaterial()
    const geo = new THREE.SphereBufferGeometry(1, 16, 16)
    return new THREE.Mesh(geo, mat)
  })

  const over = () => console.log('over')
  const out = () => console.log('out')

  return <primitive object={mesh} onPointerOver={over} onPointerOut={out} />
}

export default function App() {
  return (
    <Canvas>
      <Test />
    </Canvas>
  )
}
