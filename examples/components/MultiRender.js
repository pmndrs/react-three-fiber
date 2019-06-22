import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useRender } from 'react-three-fiber'

const CanvasStyle = {
  width: '100vw',
  height: '50vh',
}

const Obj = () => {
  const meshRef = useRef()
  useRender(() => {
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
    setTimeout(() => setSecondScene(true), 5000)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <SpinningScene />
      {secondScene && <StaticScene />}
    </div>
  )
}

export default App
