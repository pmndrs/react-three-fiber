import { Canvas } from '@react-three/fiber'
import { Suspense, useReducer } from 'react'
import { suspend } from 'suspend-react'

function SlowMaterial({ arg = 0 }) {
  suspend(() => new Promise((res) => setTimeout(res, 1000)), [arg])
  return <meshStandardMaterial name="main" color="salmon" toneMapped={false} />
}

function FallbackMaterial() {
  return <meshStandardMaterial name="fallback" color="white" />
}

export default function App() {
  const [arg, inc] = useReducer((x) => x + 1, 0)
  return (
    <Canvas>
      <ambientLight intensity={Math.PI} />
      <directionalLight />
      <mesh onClick={inc}>
        <sphereGeometry args={[1, 64, 32]} />
        <Suspense fallback={<FallbackMaterial />}>
          <SlowMaterial arg={arg} />
        </Suspense>
      </mesh>
    </Canvas>
  )
}
