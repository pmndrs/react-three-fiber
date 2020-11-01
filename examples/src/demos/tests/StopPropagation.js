import React, { useState } from 'react'
import { Canvas } from 'react-three-fiber'

function Box({ stop = false, color, position }) {
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
      <boxBufferGeometry args={[10, 10, 10]} />
      <meshPhysicalMaterial color={hovered ? 'hotpink' : color} transparent transmission={0.1} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas camera={{ fov: 75, position: [-5, 0, 25] }}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box stop color="green" position={[7, 0, -2]} />
      <Box color="red" position={[-5, 0, 0]} />
    </Canvas>
  )
}
