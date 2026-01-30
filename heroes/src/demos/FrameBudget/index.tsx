/**
 * Demo: Frame Budget Visualizer
 * Features: Scheduler Phases, FPS Throttling, Pause/Resume
 *
 * Debug panel showing frame budget. Toggle systems on/off,
 * change fps, see impact on performance.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls, Text, Stats } from '@react-three/drei'
import { useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useControls, button } from 'leva'

function ExpensiveParticles({ count, active }: { count: number; active: boolean }) {
  const points = useRef<THREE.Points>(null)

  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 10
  }

  useFrame(({ elapsed }) => {
    if (points.current && active) {
      const pos = points.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += Math.sin(elapsed + i * 0.1) * 0.01
      }
      points.current.geometry.attributes.position.needsUpdate = true
    }
  })

  if (!active) return null

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#4fc3f7" size={0.05} />
    </points>
  )
}

function PhysicsSimulation({ active }: { active: boolean }) {
  const meshes = useRef<THREE.Mesh[]>([])

  useFrame(({ elapsed }) => {
    if (!active) return

    // Simulate expensive physics calculations
    meshes.current.forEach((mesh, i) => {
      if (mesh) {
        mesh.position.y = Math.sin(elapsed * 2 + i) * 0.5 + 1
        mesh.rotation.x = elapsed + i
        mesh.rotation.z = elapsed * 0.5 + i
      }
    })
  })

  if (!active) return null

  return (
    <group>
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) meshes.current[i] = el
          }}
          position={[(i % 5) * 1.5 - 3, 1, Math.floor(i / 5) * 1.5 - 1.5]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#e57373" />
        </mesh>
      ))}
    </group>
  )
}

function AnimatedLights({ active }: { active: boolean }) {
  const light1 = useRef<THREE.PointLight>(null)
  const light2 = useRef<THREE.PointLight>(null)
  const light3 = useRef<THREE.PointLight>(null)

  useFrame(({ elapsed }) => {
    if (!active) return

    if (light1.current) {
      light1.current.position.x = Math.sin(elapsed) * 5
      light1.current.position.z = Math.cos(elapsed) * 5
    }
    if (light2.current) {
      light2.current.position.x = Math.sin(elapsed + 2) * 5
      light2.current.position.z = Math.cos(elapsed + 2) * 5
    }
    if (light3.current) {
      light3.current.position.x = Math.sin(elapsed + 4) * 5
      light3.current.position.z = Math.cos(elapsed + 4) * 5
    }
  })

  if (!active) return null

  return (
    <>
      <pointLight ref={light1} position={[5, 2, 0]} intensity={20} color="#ff6b6b" />
      <pointLight ref={light2} position={[0, 2, 5]} intensity={20} color="#4ecdc4" />
      <pointLight ref={light3} position={[-5, 2, 0]} intensity={20} color="#ffe66d" />
    </>
  )
}

function FrameTimer() {
  const [frameTime, setFrameTime] = useState(0)
  const lastTime = useRef(performance.now())

  useFrame(() => {
    const now = performance.now()
    const delta = now - lastTime.current
    lastTime.current = now
    setFrameTime(delta)
  })

  return (
    <Text position={[0, 4, 0]} fontSize={0.3} color="#ffffff">
      Frame Time: {frameTime.toFixed(2)}ms ({(1000 / frameTime).toFixed(0)} FPS)
    </Text>
  )
}

function Scene() {
  const { particles, physics, lights, particleCount } = useControls('Systems', {
    particles: { value: true, label: 'Particles' },
    physics: { value: true, label: 'Physics Boxes' },
    lights: { value: true, label: 'Moving Lights' },
    particleCount: { value: 5000, min: 1000, max: 50000, step: 1000, label: 'Particle Count' },
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.5} />

      <ExpensiveParticles count={particleCount} active={particles} />
      <PhysicsSimulation active={physics} />
      <AnimatedLights active={lights} />

      <FrameTimer />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Legend */}
      <group position={[-6, 2, 0]}>
        <Text position={[0, 1, 0]} fontSize={0.2} color="#4fc3f7" anchorX="left">
          ● Particles: {particles ? 'ON' : 'OFF'}
        </Text>
        <Text position={[0, 0.6, 0]} fontSize={0.2} color="#e57373" anchorX="left">
          ● Physics: {physics ? 'ON' : 'OFF'}
        </Text>
        <Text position={[0, 0.2, 0]} fontSize={0.2} color="#ffe66d" anchorX="left">
          ● Lights: {lights ? 'ON' : 'OFF'}
        </Text>
      </group>

      <OrbitControls />
      <Stats />
    </>
  )
}

export default function FrameBudget() {
  return (
    <Canvas renderer camera={{ position: [0, 5, 10], fov: 50 }}>
      <Scene />
    </Canvas>
  )
}
