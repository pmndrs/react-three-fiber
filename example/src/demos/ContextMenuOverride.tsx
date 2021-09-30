import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'

export default function App() {
  const [state, set] = useState(false)

  return (
    <Canvas orthographic camera={{ zoom: 150, fov: 75, position: [0, 0, 25] }}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <mesh
        position={[0, 0, 0]}
        onContextMenu={(ev) => {
          ev.nativeEvent.preventDefault()
          set((value) => !value)
        }}>
        <boxBufferGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial color={state ? 'hotpink' : 'blue'} />
      </mesh>
    </Canvas>
  )
}
