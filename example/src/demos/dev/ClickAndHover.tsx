import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'

function Box(props: any) {
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  return (
    <mesh
      onPointerOver={(e) => setHovered(true)}
      onPointerOut={(e) => setHovered(false)}
      onClick={() => setClicked(!clicked)}
      scale={clicked ? [1.5, 1.5, 1.5] : [1, 1, 1]}
      {...props}
    >
      <boxBufferGeometry />
      <meshBasicMaterial color={hovered ? 'hotpink' : 'green'} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <Box />
    </Canvas>
  )
}
