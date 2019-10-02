import * as CANNON from 'cannon'
import * as THREE from 'three'
import React, { useRef, useEffect, useState, useContext } from 'react'
import { Canvas, useFrame, addEffect, useThree } from 'react-three-fiber'

// Cannon-world context provider
const context = React.createContext()
export function Provider({ children }) {
  // Set up physics
  const [world] = useState(() => new CANNON.World())
  useEffect(() => {
    world.broadphase = new CANNON.NaiveBroadphase()
    world.solver.iterations = 10
    world.gravity.set(0, 0, -25)
  }, [world])
  // Run world stepper every frame
  useFrame(() => world.step(1 / 60))
  // Distribute world via context
  return <context.Provider value={world} children={children} />
}

// Custom hook to maintain a world physics body
export function useCannon({ ...props }, fn, deps = []) {
  const ref = useRef()
  // Get cannon world object
  const world = useContext(context)
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
  useFrame(() => {
    if (ref.current) {
      // Transport cannon physics into the referenced threejs object
      ref.current.position.copy(body.position)
      ref.current.quaternion.copy(body.quaternion)
    }
  })
  return ref
}

function Plane({ position }) {
  // Register plane as a physics body with zero mass
  const ref = useCannon({ mass: 0 }, body => {
    body.addShape(new CANNON.Plane())
    body.position.set(...position)
  })
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[1000, 1000]} />
      <meshPhongMaterial attach="material" color="#272727" />
    </mesh>
  )
}

function Box({ position }) {
  // Register box as a physics body with mass
  const ref = useCannon({ mass: 100000 }, body => {
    body.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 1)))
    body.position.set(...position)
  })
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry attach="geometry" args={[2, 2, 2]} />
      <meshStandardMaterial attach="material" />
    </mesh>
  )
}

export default function App() {
  const [showPlane, set] = useState(true)
  // When React removes (unmounts) the upper plane after 5 sec, objects should drop ...
  // This may seem like magic, but as the plane unmounts it removes itself from cannon and that's that
  useEffect(() => void setTimeout(() => set(false), 5000), [])
  return (
    <div className="main">
      <Canvas
        camera={{ position: [0, 0, 15] }}
        onCreated={({ gl }) => ((gl.shadowMap.enabled = true), (gl.shadowMap.type = THREE.PCFSoftShadowMap))}>
        <ambientLight intensity={0.5} />
        <spotLight intensity={0.6} position={[30, 30, 50]} angle={0.2} penumbra={1} castShadow />
        <Provider>
          <Plane position={[0, 0, -10]} />
          {showPlane && <Plane position={[0, 0, 0]} />}
          <Box position={[1, 0, 1]} />
          <Box position={[2, 1, 5]} />
          <Box position={[0, 0, 6]} />
          <Box position={[-1, 1, 8]} />
          <Box position={[-2, 2, 13]} />
          <Box position={[2, -1, 13]} />
          {!showPlane && <Box position={[0.5, 1.5, 20]} />}
        </Provider>
      </Canvas>
    </div>
  )
}
