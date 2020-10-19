import React from 'react'
import { Canvas } from 'react-three-fiber'

function BoxRed() {
  return (
    <mesh
      name="red"
      onPointerOver={(e) => e.stopPropagation() || console.log('BoxRed pointerOver')}
      onPointerOut={(e) => console.log('BoxRed pointerOut')}
    >
      <boxBufferGeometry args={[10, 10, 10]} />
      <meshBasicMaterial args={[{ color: 0x990000 }]} />
    </mesh>
  )
}

function BoxGreen() {
  return (
    <mesh
      name="green"
      position={[10, 0, 0]}
      onPointerOver={(e) => e.stopPropagation() || console.log('BoxGreen pointerOver')}
      onPointerOut={(e) => console.log('BoxGreen pointerOut')}
    >
      <boxBufferGeometry args={[10, 10, 10]} />
      <meshBasicMaterial args={[{ color: 0x009900 }]} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas
      style={{
        height: window.innerHeight + 'px',
        width: window.innerWidth + 'px',
      }}
      gl={{ alpha: false, antialias: false, logarithmicDepthBuffer: true }}
      camera={{ fov: 75, position: [0, 0, 25] }}
      onCreated={({ gl }) => {
        gl.setClearColor('white')
      }}
    >
      <BoxRed />
      <BoxGreen />
    </Canvas>
  )
}
