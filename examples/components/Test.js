import * as THREE from 'three'
import React, { useRef, useMemo } from 'react'
import { Canvas, useRender } from 'react-three-fiber'

function useRotate() {
  const ref = useRef()
  useRender(() => {
    ref.current.rotation.x += 0.01
    ref.current.rotation.y += 0.01
    ref.current.rotation.z += 0.01
  })
  return ref
}

function Box1(props) {
  const ref = useRotate()
  return (
    <mesh ref={ref} {...props}>
      <boxGeometry args={[5, 5, 5]} attach="geometry" />
      <meshBasicMaterial attachArray="material" color="red" />
      <meshBasicMaterial attachArray="material" color="blue" />
      <meshBasicMaterial attachArray="material" color="green" />
      <meshBasicMaterial attachArray="material" color="red" />
      <meshBasicMaterial attachArray="material" color="blue" />
      <meshBasicMaterial attachArray="material" color="green" />
    </mesh>
  )
}

function Box2(props) {
  const ref = useRotate()
  const materials = useMemo(() => {
    const red = new THREE.MeshBasicMaterial({ color: new THREE.Color('red') })
    const green = new THREE.MeshBasicMaterial({ color: new THREE.Color('green') })
    const blue = new THREE.MeshBasicMaterial({ color: new THREE.Color('blue') })
    return [red, green, blue, red, green, blue]
  })
  return (
    <mesh ref={ref} material={materials} {...props}>
      <boxGeometry args={[5, 5, 5]} attach="geometry" />
    </mesh>
  )
}

export default function App() {
  return (
    <div class="main">
      <Canvas camera={{ position: [0, 0, 20] }}>
        <ambientLight intensity={0.5} />
        <spotLight intensity={0.5} position={[300, 300, 4000]} />
        <Box1 position={[-10, 0, 0]} />
        <Box2 position={[10, 0, 0]} />
      </Canvas>
    </div>
  )
}
