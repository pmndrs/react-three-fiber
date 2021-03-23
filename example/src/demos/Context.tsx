import React, { createContext, useContext, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'

const context = createContext('black')

function ReadContext() {
  const color = useContext(context)
  return (
    <mesh>
      <boxGeometry />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

export default function App() {
  const [color, set] = useState('hotpink')
  useEffect(() => void setInterval(() => set((color) => (color === 'hotpink' ? 'aquamarine' : 'hotpink')), 500), [])
  return (
    <context.Provider value={color}>
      <Canvas context={[context]}>
        <ReadContext />
      </Canvas>
    </context.Provider>
  )
}
