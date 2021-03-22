import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'

function Box({ stop = false, color, position }: any) {
  const [hovered, set] = useState(false)
  return (
    <mesh
      name={color}
      position={position}
      onPointerOver={(e) => {
        if (stop) e.stopPropagation()
        set(true)
        console.log(`Box${color} pointerOver`)
      }}
      onPointerOut={(e) => {
        if (stop) e.stopPropagation()
        set(false)
        console.log(`Box${color} pointerOut`)
      }}
    >
      <boxBufferGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial color={hovered ? 'hotpink' : color} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas orthographic camera={{ zoom: 150, fov: 75, position: [0, 0, 25] }}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box color="blue" position={[0.5, 0, -2]} />
      <Box stop color="green" position={[0, 0, -1]} />
      <Box color="red" position={[-0.5, 0, 0]} />
    </Canvas>
  )
}
