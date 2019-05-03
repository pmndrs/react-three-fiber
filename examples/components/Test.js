import React, { useCallback } from 'react'
import { Canvas } from 'react-three-fiber'

export default function App() {
  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      camera={[0, 0, 300]}>
      <group onPointerMove={() => null}>
        <mesh onPointerUp={e => console.log('hi')}>
          <icosahedronBufferGeometry attach="geometry" args={[1, 0]} />
          <meshNormalMaterial attach="material" />
        </mesh>
      </group>
    </Canvas>
  )
}
