import * as THREE from 'three'
import React, { Suspense, useRef, useState, useCallback } from 'react'
import { Canvas, createPortal, useThree, useFrame } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'

function HUD() {
  const { gl, scene: defaultScene, camera: defaultCamera, events } = useThree()
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
            <meshStandardMaterial color={hovered ? 'orange' : 'black'} metalness={0.5} roughness={0} />
            <torusKnotGeometry args={[0.25, 0.1, 128, 32]} />
          </mesh>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <Environment preset="warehouse" />
          <Test />
        </Suspense>,
        scene,
        { events: { priority: events.priority + 1 } },
      )}
    </>
  )
}

function Test() {
  const get = useThree((state) => state.get)
  console.log(get().scene.uuid)
  return null
}

function Plane({ stop = false, color, position }: any) {
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
      <planeGeometry />
      <meshPhysicalMaterial
        metalness={1}
        roughness={0}
        color={hovered ? 'orange' : color}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas camera={{ fov: 75, position: [0, 0, -2.25] }}>
      <Suspense fallback={null}>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Plane color="lightblue" position={[0.5, 0, -1]} />
        <Plane stop color="aquamarine" position={[0, 0, -0.5]} />
        <Plane color="hotpink" position={[-0.5, 0, 0]} />
        <HUD />
        <Test />
        <Environment preset="dawn" />
      </Suspense>
      <OrbitControls />
    </Canvas>
  )
}
