import { Canvas, useTexture } from '@react-three/fiber'
import { useEffect, useState } from 'react'

export default function App() {
  return (
    <Canvas renderer>
      <Plane />
    </Canvas>
  )
}
const textures = ['/images/pmndrs.png', '/images/react.png', '/images/three.png']

function Plane() {
  const [index, setIndex] = useState(0)
  const texture = useTexture(textures[index])

  useEffect(() => {
    const interval = setInterval(() => setIndex((i) => (i + 1) % textures.length), 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <mesh scale={2}>
      <planeGeometry />
      <meshBasicMaterial transparent map={texture} />
    </mesh>
  )
}
useTexture.preload(textures)
