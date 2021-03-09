import React from 'react'
import { Canvas } from 'react-three-fiber'

function Box({ color, position }) {
  return (
    <mesh name={color} position={position}>
      <boxBufferGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial color={color} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas onPointerMissed={(name) => console.log(name)}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box color="blue" position={[0.5, 0, -2]} />
      <Box color="green" position={[0, 0, -1]} />
      <Box color="red" position={[-0.5, 0, 0]} />
    </Canvas>
  )
}
