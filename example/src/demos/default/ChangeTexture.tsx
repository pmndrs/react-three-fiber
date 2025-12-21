import { useTexture } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useDeferredValue, useEffect, useState } from 'react'

export default function App() {
  return (
    <Canvas renderer>
      <Plane />
    </Canvas>
  )
}

function Plane() {
  const textures = ['/images/pmndrs.png', '/images/react.png', '/images/three.png']
  const [index, setIndex] = useState(0)
  const deferred = useDeferredValue(index)
  const texture = useTexture(textures[deferred])

  useEffect(() => {
    const interval = setInterval(() => setIndex((i) => (i + 1) % textures.length), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <mesh scale={2}>
      <planeGeometry />
      <meshBasicMaterial transparent map={texture} />
    </mesh>
  )
}
