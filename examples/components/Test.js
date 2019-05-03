import React, { useCallback, useState, useEffect } from 'react'
import { Canvas } from 'react-three-fiber'

export default function App() {
  const [visible, set] = useState(true)

  useEffect(() => {
    setTimeout(() => set(false), 2000)
    setTimeout(() => set(true), 4000)
  }, [])

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
      {visible && (
        <group onPointerMove={() => null}>
          <mesh onPointerUp={e => console.log('hi')}>
            <icosahedronBufferGeometry attach="geometry" args={[1, 0]} />
            <meshNormalMaterial attach="material" />
          </mesh>
        </group>
      )}
    </Canvas>
  )
}
