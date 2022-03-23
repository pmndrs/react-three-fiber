import * as THREE from 'three'
import React, { useState, useEffect } from 'react'
import { Canvas, createPortal } from '@react-three/fiber'

const customCamera = new THREE.PerspectiveCamera()

export default function App() {
  const [scene1] = useState(() => Object.assign(new THREE.Scene(), { userData: { foo: 1 } }))
  const [scene2] = useState(() => Object.assign(new THREE.Scene(), { userData: { foo: 2, camera: customCamera } }))
  const [mounted, mount] = React.useReducer(() => true, false)
  React.useEffect(() => {
    const timeout = setTimeout(mount, 1000)
    return () => clearTimeout(timeout)
  }, [])
  return (
    <Canvas>
      <Cube position={[-0.5, 0, 0]} color="hotpink" />
      {createPortal(
        <group>
          {mounted && <Cube position={[0, 0.5, 0]} color="lightblue" />}
          {createPortal(<Cube position={[0.5, 0, 0]} color="aquamarine" />, scene2)}
        </group>,
        scene1,
      )}
      <primitive object={scene1} />
      <primitive object={scene2} />
    </Canvas>
  )
}

function Cube({ color, ...props }: any) {
  const ref = React.useRef<THREE.Mesh>(null!)
  useEffect(() => {
    console.log(`from within ${color}.useEffect`, (ref.current as any).__r3f.context)
  }, [])
  return (
    <mesh ref={ref} {...props}>
      <boxGeometry />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}
