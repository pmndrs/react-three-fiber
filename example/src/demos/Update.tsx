import React, { useState, useRef } from 'react'
import { Canvas, useThree, useUpdate } from '@react-three/fiber'
import { a, useSpring } from '@react-spring/three'
import { OrbitControls } from '@react-three/drei'
import { Group } from 'three'

// TODO: Test creating a custom pipeline.
// TODO: Create method for modifying FixedStage options.
// TODO: Decide best way to pass through remainder/factor for fixed states and write interp example.
// TODO: Add render with 'auto' | 'manual' options to root.
// TODO: Remove useFrame loop and move useFrame subscribers to the useUpdate loop (inside update stage?)
// TODO: Refactor priority and frames in the store. They are confusing and I don't think necessary.

function Update() {
  const groupRef = useRef<Group>(null!)

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

  useUpdate(() => {
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
  }, 'fixed')

  return (
    <group ref={groupRef}>
      <a.mesh rotation-y={rotation} scale-x={scale} scale-z={scale} onClick={() => setActive(Number(!active))}>
        <boxBufferGeometry />
        <meshBasicMaterial color="#6246ea" />
      </a.mesh>
      <OrbitControls />
    </group>
  )
}

export default function App() {
  return (
    <Canvas>
      <Update />
    </Canvas>
  )
}
