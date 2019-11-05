import React, { useRef } from 'react'
import { Canvas } from 'react-three-fiber'

function Thing() {
  const ref = useRef()

  return (
    <mesh ref={ref} onPointerMove={() => null}>
      <boxBufferGeometry attach="geometry" args={[2, 2, 2]} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

export default function() {
  return (
    <Canvas style={{ touchAction: 'none' }}>
      <Thing />
    </Canvas>
  )
}
