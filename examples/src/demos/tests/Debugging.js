import * as THREE from 'three'
import React, { useEffect, useState } from 'react'
import { Canvas } from 'react-three-fiber'

export default function App() {
  const [flag, set] = useState(true)
  useEffect(() => {
    //setTimeout(() => set(false), 1000)
  }, [])

  return (
    <Canvas>
      <mesh position={[1, 0, 0]}>
        <boxBufferGeometry />
        <meshBasicMaterial />
      </mesh>
    </Canvas>
  )
}
