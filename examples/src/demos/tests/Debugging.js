import React, { useState } from 'react'
import { a, useSpring } from '@react-spring/three'
import { Canvas } from 'react-three-fiber'

function Box(props) {
  const [hovered, setHover] = useState(false)
  const [clicked, setClicked] = useState(false)
  const boxProps = useSpring({ scale: clicked ? [1.9, 1.9, 1.9] : [1.5, 1.5, 1.5] })
  return (
    <a.mesh
      scale={clicked ? [1.9, 1.9, 1.9] : [1.5, 1.5, 1.5]}
      onClick={(e) => setClicked(!clicked)}
      onPointerOver={(e) => setHover(true)}
      onPointerOut={(e) => setHover(false)}
      {...boxProps}
    >
      <boxBufferGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </a.mesh>
  )
}

function Box2(props) {
  const [hovered, setHover] = useState(false)
  const [clicked, setClicked] = useState(false)
  return (
    <mesh
      {...props}
      scale={clicked ? [1.9, 1.9, 1.9] : [1.5, 1.5, 1.5]}
      onClick={(e) => setClicked(!clicked)}
      onPointerOver={(e) => setHover(true)}
      onPointerOut={(e) => setHover(false)}
    >
      <boxBufferGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <ambientLight />
      <Box />
      <Box2 position={[1, 1, 1]} />
    </Canvas>
  )
}
