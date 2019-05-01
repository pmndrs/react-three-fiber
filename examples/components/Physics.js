import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useRender, addEffect } from 'react-three-fiber'
import * as CANNON from 'cannon'

// Set up physics
const world = new CANNON.World()
world.gravity.set(0, 0, 0)
world.broadphase = new CANNON.NaiveBroadphase()
world.solver.iterations = 10
const groundShape = new CANNON.Plane()
const groundBody = new CANNON.Body({ mass: 0 })
groundBody.addShape(groundShape)
world.add(groundBody)
world.gravity.set(0, 0, -10)
// Add world stepper to global effects
addEffect(() => world.step(1 / 60))

function Box({ position }) {
  const [body] = useState(() => new CANNON.Body({ mass: 100 }))
  useEffect(() => {
    body.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 1)))
    body.position.set(...position)
    body.updateMassProperties()
    world.addBody(body)
    return () => world.removeBody(body)
  }, [])

  const mesh = useRef()
  useRender(() => {
    // copy coordinates from cannon to three
    mesh.current.position.copy(body.position)
    mesh.current.quaternion.copy(body.quaternion)
  })
  return (
    <mesh ref={mesh}>
      <boxGeometry attach="geometry" args={[2, 2, 2]} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

export default function App() {
  return (
    <div class="main">
      <Canvas camera={{ position: [0, 0, 15] }}>
        <ambientLight intensity={0.5} />
        <spotLight intensity={0.5} position={[300, 300, 4000]} />
        <Box position={[1, 0, 1]} />
        <Box position={[2, 1, 5]} />
        <Box position={[0, 0, 6]} />
        <Box position={[-1, 1, 8]} />
      </Canvas>
    </div>
  )
}
