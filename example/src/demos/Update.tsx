import React, { useState, useRef, useEffect } from 'react'
import { Canvas, FixedStage, Stage, Standard, useThree, useUpdate } from '@react-three/fiber'
import { a, useSpring } from '@react-spring/three'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// TODO: Decide best way to pass through remainder/factor for fixed states and write interp example.
// TODO: Add render with 'auto' | 'manual' options to root.
// TODO: Remove useFrame loop and move useFrame subscribers to the useUpdate loop (inside update stage?)
// TODO: Refactor priority and frames in the store. They are confusing and I don't think necessary.
// TODO: Add a maxDelta in loops for tab safety. (It keeps accumulating.)

const colorA = new THREE.Color('#6246ea')
const colorB = new THREE.Color('#e45858')

function Update() {
  const groupRef = useRef<THREE.Group>(null!)
  const matRef = useRef<THREE.MeshBasicMaterial>(null!)

  const [active, setActive] = useState(0)
  const state = useThree()
  // create a common spring that will be used later to interpolate other values
  const { spring } = useSpring({
    spring: active,
    config: { mass: 5, tension: 400, friction: 50, precision: 0.0001 },
  })
  // interpolate values from common spring
  const scale = spring.to([0, 1], [1, 2])
  const rotation = spring.to([0, 1], [0, Math.PI])

  useUpdate((state, dt) => {
    // console.log(dt)
    if (groupRef.current) {
      groupRef.current.rotation.x = groupRef.current.rotation.y += 0.005
    }
  })

  useUpdate(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime()
      const scalar = (Math.sin(t) + 2) / 2
      groupRef.current.scale.set(scalar, scalar, scalar)
    }

    if (matRef.current) {
      const t = clock.getElapsedTime()
      const factor = Math.sin(t) + 1
      matRef.current.color.lerpColors(colorA, colorB, factor)
    }
  }, 'fixed')

  useEffect(() => {
    state.setFixedStage('fixed', { fixedStep: 1 / 60 })
  }, [state])

  useEffect(() => console.log(state), [state])

  return (
    <group ref={groupRef}>
      <a.mesh rotation-y={rotation} scale-x={scale} scale-z={scale} onClick={() => setActive(Number(!active))}>
        <boxBufferGeometry />
        <meshBasicMaterial ref={matRef} color="#6246ea" />
      </a.mesh>
      <OrbitControls />
    </group>
  )
}

export default function App() {
  const InputStage = new Stage('input')
  const PhysicsStage = new FixedStage('physics')
  const stages = [
    Standard.Early,
    InputStage,
    Standard.Fixed,
    PhysicsStage,
    Standard.Update,
    Standard.Late,
    Standard.Render,
    Standard.After,
  ]

  return (
    <Canvas pipeline={stages}>
      <Update />
    </Canvas>
  )
}
