import React, { useState } from 'react'
import { Canvas } from 'react-three-fiber'

function Thing() {
  const [color, setColor] = useState('salmon')

  console.log(color)

  return (
    <group ref={ref => console.log('we have access to the instance')}>
      <mesh onPointerOver={e => setColor('steelblue')} onPointerOut={e => setColor('salmon')}>
        <octahedronGeometry attach="geometry" />
        <meshBasicMaterial attach="material" color={color} />
      </mesh>
    </group>
  )
}

export default function App() {
  return (
    <div>
      <Canvas
        style={{
          background: 'yellow',
          position: 'relative',
          float: 'right',
          height: '100vh',
          width: '650px',
          top: 40,
        }}>
        <Thing />
      </Canvas>
    </div>
  )
}
