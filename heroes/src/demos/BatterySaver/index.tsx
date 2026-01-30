/**
 * Demo: Battery Saver Mode
 * Features: scheduler fps
 *
 * Toggle that drops all animations to 15fps.
 * Visual battery indicator shows the savings.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls, Text } from '@react-three/drei'
import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'

function AnimatedCubes({ throttled }: { throttled: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const cubesRef = useRef<THREE.Mesh[]>([])

  // Track actual frame rate
  const lastFrameTime = useRef(performance.now())
  const [actualFps, setActualFps] = useState(60)

  useFrame(({ elapsed }) => {
    // Calculate actual FPS
    const now = performance.now()
    const delta = now - lastFrameTime.current
    lastFrameTime.current = now
    setActualFps(Math.round(1000 / delta))

    // Animate cubes
    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.3
    }

    cubesRef.current.forEach((cube, i) => {
      if (cube) {
        cube.position.y = Math.sin(elapsed * 2 + i * 0.5) * 0.5 + 1
        cube.rotation.x = elapsed + i
        cube.rotation.z = elapsed * 0.5 + i
      }
    })
  })

  const cubePositions = [
    [-2, 0, 0],
    [-1, 0, 1],
    [0, 0, -1],
    [1, 0, 1],
    [2, 0, 0],
  ]

  return (
    <>
      <group ref={groupRef}>
        {cubePositions.map((pos, i) => (
          <mesh
            key={i}
            ref={(el) => {
              if (el) cubesRef.current[i] = el
            }}
            position={pos as [number, number, number]}
            castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={`hsl(${i * 60}, 70%, 60%)`} metalness={0.3} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* FPS indicator */}
      <Text position={[0, 3, 0]} fontSize={0.4} color="#ffffff">
        {actualFps} FPS
      </Text>
      <Text position={[0, 2.5, 0]} fontSize={0.15} color={throttled ? '#f39c12' : '#2ecc71'}>
        {throttled ? 'Battery Saver ON' : 'Normal Mode'}
      </Text>
    </>
  )
}

function BatteryIndicator({ throttled, level }: { throttled: boolean; level: number }) {
  return (
    <group position={[4, 2, 0]}>
      {/* Battery outline */}
      <mesh>
        <boxGeometry args={[0.8, 1.5, 0.3]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Battery tip */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.2]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Battery fill */}
      <mesh position={[0, -0.6 + (level * 1.2) / 2, 0.05]}>
        <boxGeometry args={[0.6, level * 1.2, 0.25]} />
        <meshStandardMaterial
          color={level > 0.5 ? '#2ecc71' : level > 0.2 ? '#f39c12' : '#e74c3c'}
          emissive={level > 0.5 ? '#2ecc71' : level > 0.2 ? '#f39c12' : '#e74c3c'}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Label */}
      <Text position={[0, -1.2, 0]} fontSize={0.15} color="#ffffff">
        {Math.round(level * 100)}%
      </Text>
      <Text position={[0, -1.5, 0]} fontSize={0.1} color="#888888">
        {throttled ? 'Saving power' : 'Normal drain'}
      </Text>
    </group>
  )
}

function Scene({ throttled }: { throttled: boolean }) {
  const [batteryLevel, setBatteryLevel] = useState(1)

  useFrame(({ delta }) => {
    // Simulate battery drain (faster in normal mode)
    const drainRate = throttled ? 0.01 : 0.04
    setBatteryLevel((prev) => {
      const newLevel = prev - delta * drainRate
      return newLevel < 0.05 ? 1 : newLevel // Reset when depleted
    })
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

      <AnimatedCubes throttled={throttled} />
      <BatteryIndicator throttled={throttled} level={batteryLevel} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[15, 15]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      <OrbitControls minDistance={5} maxDistance={15} />
    </>
  )
}

function ToggleButton({ throttled, onToggle }: { throttled: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
      }}>
      <button
        onClick={onToggle}
        style={{
          padding: '12px 32px',
          fontSize: 16,
          fontWeight: 'bold',
          cursor: 'pointer',
          border: 'none',
          borderRadius: 8,
          background: throttled ? '#f39c12' : '#2ecc71',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
        }}>
        {throttled ? '🔋 Battery Saver ON' : '⚡ Normal Mode'}
      </button>
      <p
        style={{
          textAlign: 'center',
          color: 'white',
          fontSize: 12,
          marginTop: 8,
          opacity: 0.7,
        }}>
        {throttled ? 'Running at 15 FPS to save battery' : 'Running at 60 FPS'}
      </p>
    </div>
  )
}

export default function BatterySaver() {
  const [throttled, setThrottled] = useState(false)

  return (
    <>
      <Canvas renderer camera={{ position: [5, 4, 8], fov: 50 }} shadows>
        <Scene throttled={throttled} />
      </Canvas>
      <ToggleButton throttled={throttled} onToggle={() => setThrottled(!throttled)} />
    </>
  )
}
