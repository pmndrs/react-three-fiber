import * as THREE from 'three'
import React, { Suspense, useRef, useState, useCallback } from 'react'
import { Canvas, createPortal, useThree, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'

function HUD() {
  const { gl, scene: defaultScene, camera: defaultCamera } = useThree()
  const [scene] = useState(() => new THREE.Scene())
  const ref = useRef<THREE.Mesh>(null!)
  const [hovered, hover] = useState(false)

  useFrame(() => {
    gl.autoClear = true
    gl.render(defaultScene, defaultCamera)
    gl.autoClear = false
    gl.clearDepth()
    gl.render(scene, defaultCamera)
  }, 1)

  return (
    <>
      {createPortal(
        <Suspense fallback={null}>
          <mesh
            ref={ref}
            position={[0, 0, 0]}
            onPointerOver={(e) => (e.stopPropagation(), hover(true))}
            onPointerOut={(e) => hover(false)}>
            <meshStandardMaterial color={hovered ? 'orange' : '#252525'} metalness={0.5} roughness={0} />
            <sphereGeometry args={[0.25, 64, 64]} />
          </mesh>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <Environment preset="city" />
        </Suspense>,
        scene,
        { events: { enabled: true, priority: 2 } },
      )}
    </>
  )
}

function Box({ stop = false, color, position }: any) {
  const [hovered, set] = useState(false)
  const onPointerOver = useCallback((e) => {
    if (stop) e.stopPropagation()
    set(true)
  }, [])
  const onPointerOut = useCallback((e) => {
    if (stop) e.stopPropagation()
    set(false)
  }, [])
  return (
    <mesh name={color} position={position} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <boxBufferGeometry />
      <meshPhysicalMaterial roughness={0.5} color={hovered ? 'hotpink' : color} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas camera={{ fov: 50 }}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box color="blue" position={[0.5, 0, -1]} />
      <Box stop color="green" position={[0, 0, -0.5]} />
      <Box color="red" position={[-0.5, 0, 0]} />
      <HUD />
    </Canvas>
  )
}
