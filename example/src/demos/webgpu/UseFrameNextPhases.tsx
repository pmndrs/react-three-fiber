/**
 * useFrame Phase Ordering Demo
 *
 * Demonstrates phase-based execution order:
 * - Physics phase: Ball bounces (runs first)
 * - Update phase: Shadow follows ball with lerp (runs after physics)
 *
 * The shadow always trails behind because update phase
 * executes AFTER physics phase each frame.
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { color, mix, sin, time } from 'three/tsl'
import * as THREE from 'three'
import { CameraControls } from '@react-three/drei'

//* Bouncing Ball (Physics Phase) ==============================

function BouncingBall() {
  const ballRef = useRef<THREE.Mesh>(null!)
  const shadowRef = useRef<THREE.Mesh>(null!)

  // TSL materials
  const ballColorNode = useMemo(() => {
    const pink = color('hotpink')
    const coral = color('coral')
    const t = sin(time.mul(2)).mul(0.5).add(0.5)
    return mix(pink, coral, t)
  }, [])

  // Physics phase - calculate ball position (runs FIRST)
  useFrame(
    (state) => {
      const t = state.elapsed

      // Horizontal oscillation
      ballRef.current.position.x = Math.sin(t * 2) * 3

      // Bouncing motion
      ballRef.current.position.y = Math.abs(Math.sin(t * 3)) * 2 + 0.5

      // Slight depth variation
      ballRef.current.position.z = Math.cos(t * 1.5) * 0.5
    },
    { phase: 'physics', id: 'ball-physics' },
  )

  // Update phase - shadow follows ball (runs AFTER physics)
  useFrame(
    (state, delta) => {
      // Lerp shadow X toward ball X (with lag)
      //      console.log(delta)
      // delta is in ms, convert to seconds and use as lerp factor
      const lerpFactor = delta * 4 // 4 units per second

      shadowRef.current.position.x = THREE.MathUtils.lerp(
        shadowRef.current.position.x,
        ballRef.current.position.x,
        lerpFactor,
      )

      // Shadow stays on ground, scales based on ball height
      const ballHeight = ballRef.current.position.y
      const scale = THREE.MathUtils.mapLinear(ballHeight, 0.5, 2.5, 1.2, 0.6)
      shadowRef.current.scale.set(scale, scale, 1)

      // Fade shadow based on height (more visible range)
      const opacity = THREE.MathUtils.mapLinear(ballHeight, 0.5, 2.5, 0.7, 0.3)
      const material = shadowRef.current.material as THREE.MeshBasicMaterial
      material.opacity = opacity
    },
    { id: 'shadow-follow' },
  )

  return (
    <>
      {/* Ball */}
      <mesh ref={ballRef} position={[0, 1, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardNodeMaterial colorNode={ballColorNode} roughness={0.2} metalness={0.3} />
      </mesh>

      {/* Shadow on ground */}
      <mesh ref={shadowRef} position={[0, -0.99, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.6} />
      </mesh>
    </>
  )
}

//* Ground Plane ==============================

function Ground() {
  const colorNode = useMemo(() => color('#4343FF'), [])

  return (
    <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardNodeMaterial colorNode={colorNode} roughness={0.8} />
    </mesh>
  )
}

//* Main Export ==============================

export default function useFramePhases() {
  return (
    <Canvas renderer camera={{ position: [0, 3, 8], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="cyan" />

      <BouncingBall />
      <Ground />
      <CameraControls />
    </Canvas>
  )
}
