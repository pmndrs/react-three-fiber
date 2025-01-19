import * as React from 'react'
import { Canvas } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'

export default function App() {
  return (
    <Canvas>
      <Plane />
    </Canvas>
  )
}

function Plane() {
  const textures = ['/pmndrs.png', '/react.png', '/three.png']
  const [index, set] = React.useState(0)
  const deferred = React.useDeferredValue(index)
  React.useEffect(() => {
    const interval = setInterval(() => set((i) => (i + 1) % textures.length), 1000)
    return () => clearInterval(interval)
  }, [])
  const texture = useTexture(textures[deferred])
  return (
    <mesh scale={2}>
      <planeGeometry />
      <meshBasicMaterial transparent map={texture} />
    </mesh>
  )
}
