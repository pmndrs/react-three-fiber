import * as THREE from 'three'
import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'

const test = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: 'red' }))

function Box(props: any) {
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  return (
    <mesh
      onPointerOver={(e) => setHovered(true)}
      onPointerOut={(e) => setHovered(false)}
      onClick={() => setClicked(!clicked)}
      scale={clicked ? [1.5, 1.5, 1.5] : [1, 1, 1]}
      {...props}>
      <boxBufferGeometry />
      <meshBasicMaterial color={hovered ? 'hotpink' : 'aquamarine'} />
    </mesh>
  )
}

function Box2(props: any) {
  return <primitive object={test} {...props} onClick={() => console.log('hi')} />
}

export default function App() {
  return (
    <Canvas>
      <Box position={[-0.5, 0, 0]} />
      <Box2 position={[0.5, 0, 0]} />
    </Canvas>
  )
}
