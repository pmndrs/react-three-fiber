import React, { useState } from 'react'
import { Canvas } from 'react-three-fiber'

function Box(props) {
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)
  return (
    <mesh
      onPointerMissed={(e) => setActive(false)}
      onPointerOver={(e) => setHovered(true)}
      onPointerOut={(e) => setHovered(false)}
      onClick={() => setActive(!active)}
      scale={active ? [1.5, 1.5, 1.5] : [1, 1, 1]}
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
      <Box position={[-1, 0, 0]} />
      <Box position={[1, 0, 0]} />
    </Canvas>
  )
}
