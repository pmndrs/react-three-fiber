import { Canvas, useLoader } from '@react-three/fiber'
import { Suspense, useEffect, useReducer } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function Test() {
  const [flag, toggle] = useReducer((state) => !state, true)
  const { scene } = useLoader(GLTFLoader, flag ? '/models/Stork.glb' : '/models/Parrot.glb')

  useEffect(() => {
    const interval = setInterval(toggle, 1000)
    return () => clearInterval(interval)
  }, [])

  return <primitive object={scene} />
}

export default function App() {
  return (
    <Canvas renderer>
      <ambientLight intensity={Math.PI} />
      <Suspense fallback={null}>
        <Test />
      </Suspense>
    </Canvas>
  )
}
