import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'

const CanvasStyle = {
  width: '100%',
  height: '50%',
}

const Obj = () => {
  const meshRef = useRef()
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.03
    }
  })
  return (
    <mesh ref={meshRef}>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}
const SpinningScene = () => (
  <div style={CanvasStyle}>
    <Canvas>
      <Obj />
    </Canvas>
  </div>
)

const StaticScene = () => (
  <div style={CanvasStyle}>
    <Canvas>
      <mesh>
        <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
        <meshNormalMaterial attach="material" />
      </mesh>
    </Canvas>
  </div>
)
/** Main component */
function App() {
  const [secondScene, setSecondScene] = useState(false)

  useEffect(() => {
    setTimeout(() => setSecondScene(true), 2000)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <SpinningScene />
      {secondScene && <StaticScene />}
    </div>
  )
}

export default App
