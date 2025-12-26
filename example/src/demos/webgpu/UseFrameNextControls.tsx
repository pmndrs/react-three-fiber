/**
 * useFrame Controls Demo
 *
 * Demonstrates the controls API returned by useFrame:
 * - pause() / resume() - Pause/resume individual jobs
 * - step() / stepAll() - Manual stepping
 * - isPaused - Reactive pause state
 * - scheduler.stop() / scheduler.start() - Control the entire loop
 *
 * Shows both individual job control AND scheduler-level control.
 */

import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { color, mix, sin, time } from 'three/tsl'
import * as THREE from 'three/webgpu'
import { CameraControls } from '@react-three/drei'
import { ControlPanel, SpotlightControls } from './ControlPanel'
import { useLocalNodes } from '@react-three/fiber/webgpu'

//* Orbiting Ball + Light ==============================
// Uses plain useFrame with no config - just like normal animation

function OrbitingElements() {
  const ballRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const angleRef = useRef(0)

  // Plain useFrame - no options, just callback
  // This is how most animations would be written
  useFrame((state, delta) => {
    const radius = 3
    const angle = angleRef.current
    const ball = ballRef.current
    const light = lightRef.current

    angleRef.current += delta * 3

    // Orbit the ball
    ball.position.x = Math.cos(angle) * radius
    ball.position.z = Math.sin(angle) * radius
    ball.position.y = Math.sin(angle * 2) * 0.5

    // Light orbits opposite direction, slightly offset
    light.position.x = Math.cos(-angle * 0.7) * radius * 1.2
    light.position.z = Math.sin(-angle * 0.7) * radius * 1.2
    light.position.y = Math.cos(angle) * 1.5 + 1
  })

  return (
    <>
      {/* Orbiting ball */}
      <mesh ref={ballRef} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardNodeMaterial color="coral" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Orbiting point light */}
      <pointLight ref={lightRef} intensity={15} color="hotpink" distance={8} />
    </>
  )
}

//* Moving Spotlight ==============================

function MovingSpotlight() {
  const { scene } = useThree()
  const lightRef = useRef<THREE.SpotLight>(null!)
  const helperRef = useRef<THREE.SpotLightHelper>(null!)

  useFrame(
    ({ elapsed }, delta) => {
      const light = lightRef.current
      const maxX = 5
      const speed = 0.1 // Speed multiplier

      // Ping-pong using sin wave
      light.position.x = Math.sin(elapsed * speed) * maxX

      // Point the light downward at the center (always at 0,0,0)
      light.target.position.set(0, 0, 0)
      light.target.updateMatrixWorld()

      helperRef.current?.update()
    },
    { id: 'moving-spotlight' },
  )

  // with vanilla add a helper
  useEffect(() => {
    if (!lightRef.current) return
    helperRef.current = new THREE.SpotLightHelper(lightRef.current, 1)
    scene.add(helperRef.current)
    return () => {
      scene.remove(helperRef.current)
    }
  }, [scene])
  return (
    <spotLight
      castShadow
      ref={lightRef}
      position={[0, 10, 0]}
      intensity={200}
      angle={Math.PI / 12}
      penumbra={0.3}
      decay={2}
      distance={20}
    />
  )
}

//* Scene ==============================

interface SceneProps {
  onControlsReady: (controls: any) => void
}

function DemoScene({ onControlsReady }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <OrbitingElements />
      <MovingSpotlight />
      <SpotlightControls />
      <ControlledSphereWithCallback onControlsReady={onControlsReady} />
      <mesh position={[0, -0.99, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardNodeMaterial color="white" />
      </mesh>
    </>
  )
}

//* Sphere wrapper that reports controls ==============================

interface ControlledSphereWithCallbackProps {
  onControlsReady: (controls: any) => void
}

function ControlledSphereWithCallback({ onControlsReady }: ControlledSphereWithCallbackProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  // TSL color that shifts over time
  const colorNode = useMemo(() => {
    const blue = color('royalblue')
    const purple = color('mediumpurple')
    const t = sin(time.mul(1.5)).mul(0.5).add(0.5)
    return mix(blue, purple, t)
  }, [])

  // useFrame with fps limit
  const controls = useFrame(
    (state, delta) => {
      meshRef.current.rotation.x += delta * 0.2
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.rotation.z += delta * 0.075
    },
    { id: 'spinning-sphere', fps: 30 },
  )

  // Report controls to parent on mount
  useMemo(() => {
    onControlsReady(controls)
  }, [controls, onControlsReady])

  return (
    <mesh ref={meshRef} castShadow>
      <icosahedronGeometry args={[1.5, 2]} />
      <meshStandardNodeMaterial colorNode={colorNode} roughness={0.2} metalness={0.6} flatShading />
    </mesh>
  )
}

//* Main Export ==============================

export default function useFrameControls() {
  const [sphereControls, setSphereControls] = useState<any>(null)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas renderer camera={{ position: [0, 0, 8], fov: 50 }}>
        <DemoScene onControlsReady={(controls) => setSphereControls(controls)} />
        <CameraControls />
      </Canvas>

      {/* UI outside Canvas to avoid WebGPU HTML flipping issues */}
      <ControlPanel sphereControls={sphereControls} />
    </div>
  )
}
