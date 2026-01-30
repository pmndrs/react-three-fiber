/**
 * Demo: Procedural Coral
 * Features: useBuffers, useNodes, Compute
 *
 * Growing coral reef with branches that grow based on
 * procedural rules. Organic, beautiful visualization.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls, Environment } from '@react-three/drei'
import { useRef, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'

interface Branch {
  start: THREE.Vector3
  end: THREE.Vector3
  radius: number
  depth: number
  color: THREE.Color
}

function generateCoralBranches(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  radius: number,
  depth: number,
  maxDepth: number,
  branches: Branch[],
  baseColor: THREE.Color,
): void {
  if (depth > maxDepth || radius < 0.01) return

  const length = radius * 3 + Math.random() * radius
  const end = origin.clone().add(direction.clone().multiplyScalar(length))

  // Color gets lighter as we go up
  const color = baseColor.clone()
  color.offsetHSL(0, -depth * 0.05, depth * 0.05)

  branches.push({ start: origin, end, radius, depth, color })

  // Create child branches
  const numChildren = Math.floor(Math.random() * 3) + 1

  for (let i = 0; i < numChildren; i++) {
    // Random deviation from parent direction
    const childDir = direction.clone()
    childDir.x += (Math.random() - 0.5) * 0.8
    childDir.z += (Math.random() - 0.5) * 0.8
    childDir.y += Math.random() * 0.3 + 0.2 // Bias upward
    childDir.normalize()

    generateCoralBranches(end, childDir, radius * (0.6 + Math.random() * 0.2), depth + 1, maxDepth, branches, baseColor)
  }
}

function CoralBranch({ branch, growthProgress }: { branch: Branch; growthProgress: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const progress = Math.max(0, Math.min(1, growthProgress - branch.depth * 0.15))

  if (progress <= 0) return null

  const actualEnd = branch.start.clone().lerp(branch.end, progress)
  const length = branch.start.distanceTo(actualEnd)
  const midpoint = branch.start.clone().add(actualEnd).multiplyScalar(0.5)

  // Calculate rotation to point from start to end
  const direction = actualEnd.clone().sub(branch.start).normalize()
  const quaternion = new THREE.Quaternion()
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)

  return (
    <mesh ref={meshRef} position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[branch.radius * 0.7 * progress, branch.radius * progress, length, 8]} />
      <meshStandardMaterial color={branch.color} roughness={0.6} metalness={0.1} />
    </mesh>
  )
}

function Coral({ position, color }: { position: [number, number, number]; color: string }) {
  const [growthProgress, setGrowthProgress] = useState(0)

  const branches = useMemo(() => {
    const result: Branch[] = []
    const baseColor = new THREE.Color(color)

    // Generate 3-5 main stems
    const numStems = Math.floor(Math.random() * 3) + 3
    for (let i = 0; i < numStems; i++) {
      const angle = (i / numStems) * Math.PI * 2 + Math.random() * 0.5
      const direction = new THREE.Vector3(Math.sin(angle) * 0.3, 1, Math.cos(angle) * 0.3).normalize()

      generateCoralBranches(new THREE.Vector3(0, 0, 0), direction, 0.08 + Math.random() * 0.04, 0, 6, result, baseColor)
    }

    return result
  }, [color])

  useFrame(({ delta }) => {
    if (growthProgress < 2) {
      setGrowthProgress((p) => Math.min(2, p + delta * 0.3))
    }
  })

  return (
    <group position={position}>
      {branches.map((branch, i) => (
        <CoralBranch key={i} branch={branch} growthProgress={growthProgress} />
      ))}
    </group>
  )
}

function SeaFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30, 64, 64]} />
      <meshStandardMaterial color="#1a3a4a" roughness={0.9} />
    </mesh>
  )
}

function Bubbles() {
  const groupRef = useRef<THREE.Group>(null)
  const bubbles = useMemo(() => {
    return Array.from({ length: 30 }, () => ({
      position: [(Math.random() - 0.5) * 10, Math.random() * 5, (Math.random() - 0.5) * 10],
      speed: Math.random() * 0.5 + 0.3,
      size: Math.random() * 0.05 + 0.02,
    }))
  }, [])

  useFrame(({ elapsed }) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const bubble = bubbles[i]
        child.position.y = (elapsed * bubble.speed + bubble.position[1]) % 8
        child.position.x = bubble.position[0] + Math.sin(elapsed + i) * 0.1
      })
    }
  })

  return (
    <group ref={groupRef}>
      {bubbles.map((bubble, i) => (
        <mesh key={i} position={bubble.position as [number, number, number]}>
          <sphereGeometry args={[bubble.size, 8, 8]} />
          <meshBasicMaterial color="#88ccff" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function Scene() {
  const { showBubbles } = useControls({
    showBubbles: { value: true, label: 'Show Bubbles' },
  })

  const corals = useMemo(
    () => [
      { position: [0, 0, 0] as [number, number, number], color: '#ff6b6b' },
      { position: [-3, 0, 1] as [number, number, number], color: '#feca57' },
      { position: [2.5, 0, -1.5] as [number, number, number], color: '#ff9ff3' },
      { position: [-1.5, 0, -2] as [number, number, number], color: '#54a0ff' },
      { position: [3, 0, 2] as [number, number, number], color: '#5f27cd' },
    ],
    [],
  )

  return (
    <>
      {/* Underwater lighting */}
      <ambientLight intensity={0.3} color="#4fc3f7" />
      <directionalLight position={[5, 15, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#00bcd4" />

      {/* Underwater fog */}
      <fog attach="fog" args={['#0a2a3a', 5, 25]} />
      <color attach="background" args={['#0a2a3a']} />

      {corals.map((coral, i) => (
        <Coral key={i} {...coral} />
      ))}

      <SeaFloor />
      {showBubbles && <Bubbles />}

      <OrbitControls
        minDistance={4}
        maxDistance={15}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  )
}

export default function ProceduralCoral() {
  return (
    <Canvas renderer camera={{ position: [6, 4, 6], fov: 50 }} shadows>
      <Scene />
    </Canvas>
  )
}
