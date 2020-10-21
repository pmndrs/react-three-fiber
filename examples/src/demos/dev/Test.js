import React from 'react'
import { Canvas } from 'react-three-fiber'

function Box({ color, position }) {
  return (
    <mesh
      name={color}
      position={position}
      onPointerOver={(e) => e.stopPropagation() || console.log(`Box${color} pointerOver`)}
      onPointerOut={(e) => console.log(`Box${color} pointerOut`)}
    >
      <boxBufferGeometry args={[10, 10, 10]} />
      <meshPhysicalMaterial color={color} transparent transmission={0.1} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas camera={{ fov: 75, position: [-5, 0, 25] }}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box color="green" position={[7, 0, -2]} />
      <Box color="red" position={[-5, 0, 0]} />
    </Canvas>
  )
}
