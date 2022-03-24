import * as THREE from 'three'
import React, { useState, useEffect } from 'react'
import { Canvas, Inject, createPortal, useThree } from '@react-three/fiber'

const customCamera1 = new THREE.PerspectiveCamera()
const customCamera2 = new THREE.PerspectiveCamera()

export default function App() {
  const [scene1] = useState(() => new THREE.Scene())
  const [scene2] = useState(() => new THREE.Scene())
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
          {createPortal(<Cube position={[0.5, 0, 0]} color="aquamarine" />, scene2, { camera: customCamera2 })}
        </group>,
        scene1,
        { camera: customCamera1 },
      )}
      <primitive object={scene1} />
      <primitive object={scene2} />
    </Canvas>
  )
}

function Cube({ color, ...props }: any) {
  const camera = useThree((state) => state.camera)
  const ref = React.useRef<THREE.Mesh>(null!)
  useEffect(() => {
    console.log(
      `from within ${color}.useEffect`,
      (ref.current as any).__r3f.root.getState().camera,
      'camera',
      camera.uuid,
    )
  }, [])
  return (
    <mesh ref={ref} {...props}>
      <boxGeometry />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}
