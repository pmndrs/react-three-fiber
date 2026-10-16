import { Canvas, type ThreeElements } from '@react-three/fiber'
import { useEffect, useReducer } from 'react'
import * as THREE from 'three'

const invisibleLayer = new THREE.Layers()
invisibleLayer.set(4)

const visibleLayers = new THREE.Layers()
visibleLayers.enableAll()
visibleLayers.disable(4)

function Box(props: ThreeElements['mesh']) {
  return (
    <mesh {...props}>
      <boxGeometry />
      <meshBasicMaterial color="lightblue" toneMapped={false} />
    </mesh>
  )
}

function Sphere(props: ThreeElements['mesh']) {
  return (
    <mesh {...props}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshBasicMaterial color="aquamarine" toneMapped={false} />
    </mesh>
  )
}

export default function App() {
  const [visible, toggle] = useReducer((state) => !state, false)

  useEffect(() => {
    const interval = setInterval(toggle, 1000)
    return () => clearInterval(interval)
  })

  return (
    <Canvas camera={{ layers: visibleLayers }}>
      <Box position={[-0.5, 0, 0]} layers={!visible ? invisibleLayer : visibleLayers} />
      <Sphere position={[0.5, 0, 0]} layers={visible ? invisibleLayer : visibleLayers} />
    </Canvas>
  )
}
