/**
 * Demo: Lazy City
 * Features: onFramed, onVisible, Frustum
 *
 * Large city where buildings only animate/load when visible.
 * Counter shows active vs sleeping objects.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { OrbitControls, Text } from '@react-three/drei'
import { useRef, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'

// Global counter for active buildings
let activeCount = 0
let totalCount = 0

function Building({
  position,
  height,
  color,
  onActiveChange,
}: {
  position: [number, number, number]
  height: number
  color: string
  onActiveChange: (active: boolean) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isActive, setIsActive] = useState(false)
  const activeRef = useRef(false)

  useFrame(({ elapsed }) => {
    if (meshRef.current && activeRef.current) {
      // Only animate when visible
      meshRef.current.scale.y = 1 + Math.sin(elapsed * 2 + position[0]) * 0.05
    }
  })

  const handleFramed = useCallback(
    (inView: boolean) => {
      if (inView !== activeRef.current) {
        activeRef.current = inView
        setIsActive(inView)
        onActiveChange(inView)
      }
    },
    [onActiveChange],
  )

  return (
    <mesh
      ref={meshRef}
      position={[position[0], height / 2, position[2]]}
      onPointerOver={() => {}}
      // @ts-ignore - onFramed is a v10 feature
      onFramed={handleFramed}>
      <boxGeometry args={[0.8, height, 0.8]} />
      <meshStandardMaterial
        color={isActive ? color : '#333333'}
        emissive={isActive ? color : '#000000'}
        emissiveIntensity={isActive ? 0.1 : 0}
      />
    </mesh>
  )
}

function CityGrid({ onCountChange }: { onCountChange: (active: number, total: number) => void }) {
  const activeCountRef = useRef(0)

  const buildings = useMemo(() => {
    const result: Array<{
      position: [number, number, number]
      height: number
      color: string
    }> = []

    const gridSize = 10
    const spacing = 2

    for (let x = -gridSize; x <= gridSize; x++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        // Skip center area for camera space
        if (Math.abs(x) < 2 && Math.abs(z) < 2) continue

        const height = Math.random() * 3 + 1
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6']
        const color = colors[Math.floor(Math.random() * colors.length)]

        result.push({
          position: [x * spacing, 0, z * spacing],
          height,
          color,
        })
      }
    }

    totalCount = result.length
    return result
  }, [])

  const handleActiveChange = useCallback(
    (active: boolean) => {
      activeCountRef.current += active ? 1 : -1
      onCountChange(activeCountRef.current, totalCount)
    },
    [onCountChange],
  )

  return (
    <>
      {buildings.map((building, i) => (
        <Building key={i} {...building} onActiveChange={handleActiveChange} />
      ))}
    </>
  )
}

function StatusDisplay({ active, total }: { active: number; total: number }) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position)
      groupRef.current.position.y += 3
      groupRef.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <group ref={groupRef}>
      <Text position={[0, 0, -5]} fontSize={0.3} color="#ffffff">
        Active: {active} / {total} buildings
      </Text>
      <Text position={[0, -0.4, -5]} fontSize={0.15} color="#888888">
        {((active / total) * 100).toFixed(1)}% of city is rendering
      </Text>
    </group>
  )
}

function Scene() {
  const [counts, setCounts] = useState({ active: 0, total: 0 })

  const handleCountChange = useCallback((active: number, total: number) => {
    setCounts({ active, total })
  }, [])

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[2, 100]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[100, 2]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>

      <CityGrid onCountChange={handleCountChange} />
      <StatusDisplay active={counts.active} total={counts.total} />

      <OrbitControls minDistance={5} maxDistance={50} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.5} />
    </>
  )
}

export default function LazyCity() {
  return (
    <Canvas renderer camera={{ position: [15, 15, 15], fov: 60 }} shadows>
      <Scene />
    </Canvas>
  )
}
