import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useRender, addEffect, useThree } from 'react-three-fiber'
import * as CANNON from 'cannon'
import * as THREE from 'three'
import useBody from './useBody'
import './styles.css'

// Custom hook to maintain a world physics body
function useBody({ world, ...props }, fn, deps = []) {
  // Instanciate a physics body
  const [body] = useState(() => new CANNON.Body(props))
  useEffect(() => {
    // Call function so the user can add shapes
    fn(body)
    // Add body to world on mount
    world.addBody(body)
    // Remove body on unmount
    return () => world.removeBody(body)
  }, deps)
  // Return body
  return body
}

// Set up physics
const world = new CANNON.World()
world.broadphase = new CANNON.NaiveBroadphase()
world.solver.iterations = 10
world.gravity.set(0, 0, -20)
// Add world stepper to global effects
addEffect(() => world.step(1 / 60))

function Plane({ position }) {
  // Register plane as a physics body with zero mass
  useBody({ world, mass: 0 }, body => {
    body.addShape(new CANNON.Plane())
    body.position.set(...position)
  })
  return (
    <mesh receiveShadow position={position}>
      <planeBufferGeometry attach="geometry" args={[1000, 1000]} />
      <meshPhongMaterial attach="material" color="#272727" />
    </mesh>
  )
}

function Box({ position }) {
  // Register box as a physics body with mass
  const body = useBody({ world, mass: 100 }, body => {
    body.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 1)))
    body.position.set(...position)
  })
  const mesh = useRef()
  useRender(() => {
    if (mesh.current) {
      // Translate physics data into threejs
      mesh.current.position.copy(body.position)
      mesh.current.quaternion.copy(body.quaternion)
    }
  })
  return (
    <mesh ref={mesh} castShadow receiveShadow>
      <boxGeometry attach="geometry" args={[2, 2, 2]} />
      <meshStandardMaterial attach="material" />
    </mesh>
  )
}

function Lights() {
  const { gl } = useThree()
  useEffect(() => {
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap
  }, [gl])
  return (
    <group>
      <ambientLight intensity={0.5} />
      <spotLight intensity={0.5} position={[30, 30, 40]} castShadow />
    </group>
  )
}

export default function App() {
  const [showPlane, set] = useState(true)
  // React removes (unmounts) 1st plane after 5 sec, objects should drop ...
  useEffect(() => void setTimeout(() => set(false), 5000), [])
  return (
    <div className="main">
      <Canvas camera={{ position: [0, 0, 15] }}>
        <Lights />
        <Plane position={[0, 0, -10]} />
        {showPlane && <Plane position={[0, 0, 0]} />}
        <Box position={[1, 0, 1]} />
        <Box position={[2, 1, 5]} />
        <Box position={[0, 0, 6]} />
        <Box position={[-1, 1, 8]} />
        <Box position={[-2, 2, 13]} />
        <Box position={[2, -2, 13]} />
        <Box position={[0.5, 1.2, 200]} />
      </Canvas>
    </div>
  )
}
