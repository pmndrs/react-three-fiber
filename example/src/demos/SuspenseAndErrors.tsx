import * as React from 'react'
import { useState, useEffect } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { suspend } from 'suspend-react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Suspends the scene for 2 seconds, simulating loading an async asset
function AsyncComponent({ cacheKey }: { cacheKey: string }) {
  suspend(() => new Promise((res) => setTimeout(res, 2000)), [cacheKey])
  return null
}

// Loads a file that does not exist
function SimulateError() {
  useLoader(GLTFLoader, '/doesnotexist.glb')
  return null
}

export default function App() {
  const [load, setLoad] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setLoad(true), 3000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <Canvas orthographic camera={{ position: [10, 10, 10], zoom: 100 }}>
      <ambientLight intensity={Math.PI} />
      <pointLight decay={0} position={[10, 10, 5]} intensity={2} />
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="orange" />
      </mesh>
      <AsyncComponent cacheKey="1" />
      {load && <SimulateError />}
    </Canvas>
  )
}
