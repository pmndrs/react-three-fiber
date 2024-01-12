import React, { Suspense, useEffect, useReducer } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

function Test() {
  const [flag, toggle] = useReducer((state) => !state, true)
  useEffect(() => {
    const interval = setInterval(toggle, 1000)
    return () => clearInterval(interval)
  }, [])
  const { scene } = useLoader(GLTFLoader, flag ? '/Stork.glb' : '/Parrot.glb') as any
  return <primitive object={scene} />
}

export default function App() {
  return (
    <Canvas>
      <ambientLight intensity={Math.PI} />
      <Suspense fallback={null}>
        <Test />
      </Suspense>
    </Canvas>
  )
}
