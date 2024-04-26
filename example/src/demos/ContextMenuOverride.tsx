import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'

export default function App() {
  const [state, set] = useState(false)

  return (
    <Canvas
      orthographic
      camera={{ zoom: 150, fov: 75, position: [0, 0, 25] }}
      onPointerMissed={() => console.log('canvas.missed')}>
      <ambientLight intensity={Math.PI} />
      <pointLight decay={0} position={[10, 10, 10]} />
      <mesh
        scale={[2, 2, 2]}
        position={[1, 0, 0]}
        onContextMenu={(ev) => {
          ev.nativeEvent.preventDefault()
          set((value) => !value)
        }}
        onPointerMissed={() => console.log('mesh.missed')}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial color={state ? 'hotpink' : 'blue'} />
      </mesh>
    </Canvas>
  )
}
