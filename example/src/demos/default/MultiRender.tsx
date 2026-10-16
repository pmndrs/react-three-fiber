import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const CanvasStyle = {
  width: '100%',
  height: '50%',
}

const Object = () => {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.03
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshNormalMaterial />
    </mesh>
  )
}

const SpinningScene = () => (
  <div style={CanvasStyle}>
    <Canvas>
      <Object />
    </Canvas>
  </div>
)

const StaticScene = () => (
  <div style={CanvasStyle}>
    <Canvas>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshNormalMaterial />
      </mesh>
    </Canvas>
  </div>
)

export default function App() {
  const [secondScene, setSecondScene] = useState(false)

  useEffect(() => {
    setTimeout(() => setSecondScene(true), 500)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <SpinningScene />
      {secondScene && <StaticScene />}
    </div>
  )
}
