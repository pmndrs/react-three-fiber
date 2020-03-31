import * as THREE from 'three'
import React, { useRef, useEffect, useState } from 'react'
import { Canvas } from 'react-three-fiber'

const Cube = () => {
  const [x, set] = useState(0)
  const ref = useRef()
  useEffect(() => {
    ref.current.position.y = -2
    set(1)
  }, [])

  return (
    <mesh ref={ref} position={[0, 1, 0]}>
      <boxBufferGeometry attach="geometry" />
      <meshBasicMaterial attach="material" color="hotpink" />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <Cube />
    </Canvas>
  )
}
