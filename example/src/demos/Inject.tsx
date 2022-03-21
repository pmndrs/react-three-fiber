import * as THREE from 'three'
import React, { useState, useEffect, useRef } from 'react'
import { Canvas, createPortal } from '@react-three/fiber'

const customCamera = new THREE.PerspectiveCamera()

export default function App() {
  const [foo, setFoo] = React.useState(2)
  const [mounted, mount] = React.useReducer(() => true, false)
  React.useEffect(() => {
    setTimeout(mount, 1000)
    setTimeout(() => setFoo(3), 2000)
  }, [])

  const [o] = React.useState(() => new THREE.Group())

  return (
    <Canvas>
      <inject foo={1} camera={customCamera}>
        <Cube position={[0.5, 0, 0]} color="aquamarine" />
        <inject foo={foo}>{mounted && <Cube position={[0, 0.5, 0]} color="lightblue" />}</inject>
      </inject>
      <Cube position={[-0.5, 0, 0]} color="hotpink" />
    </Canvas>
  )
}

function Cube({ color, ...props }: any) {
  const ref = React.useRef<THREE.Mesh>(null!)
  useEffect(() => {
    console.log(`from within ${color}.useEffect`, (ref.current as any).__r3f.getContext())
  })
  return (
    <mesh ref={ref} {...props}>
      <boxGeometry />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}
