import * as THREE from 'three'
import React, { useState, useEffect } from 'react'
import { Canvas, useThree } from 'react-three-fiber'

const Box = React.memo(props => {
  const { viewport } = useThree()
  console.log('render', viewport)
  return (
    <mesh>
      <boxGeometry args={[5, 5, 5]} attach="geometry" />
      <meshBasicMaterial attachArray="material" color="red" />
      <meshBasicMaterial attachArray="material" color="green" />
      <meshBasicMaterial attachArray="material" color="blue" />
      <meshBasicMaterial attachArray="material" color="red" />
      <meshBasicMaterial attachArray="material" color="green" />
      <meshBasicMaterial attachArray="material" color="blue" />
    </mesh>
  )
})

export default function App() {
  const [_, set] = useState(0)
  useEffect(() => void setInterval(() => set(s => s + 1), 500), [])
  return (
    <div class="main">
      <Canvas camera={{ position: [0, 0, 20] }}>
        <Box />
      </Canvas>
    </div>
  )
}
