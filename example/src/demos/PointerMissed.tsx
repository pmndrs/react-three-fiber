import React, { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'

function Box({ color, position }: any) {
  const [flag, set] = useState(false)
  const onPointerMissed = useCallback((e) => {
    set((s) => !s)
  }, [])
  return (
    <mesh name={color} position={position} rotation={[0, 0, 0]} onPointerMissed={onPointerMissed}>
      <boxBufferGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial roughness={0.5} color={flag ? 'hotpink' : color} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas orthographic camera={{ zoom: 150, fov: 75, position: [0, 0, 25] }}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box color="blue" position={[0.5, 0, -2]} />
      <Box color="red" position={[-0.5, 0, 0]} />
    </Canvas>
  )
}
