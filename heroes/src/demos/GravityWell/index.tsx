/**
 * Demo: Gravity Well
 * Features: useBuffers, useNodes, Compute
 *
 * Particle system with multiple gravity wells.
 * Drag wells around to see particles respond.
 */

import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber/webgpu'
import { OrbitControls, Text } from '@react-three/drei'
import { useRef, useMemo, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'

interface GravityWellData {
  position: THREE.Vector3
  strength: number
  color: string
}

function GravityWellMarker({ well, onDrag }: { well: GravityWellData; onDrag: (position: THREE.Vector3) => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      // Pulsing effect
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.1
      meshRef.current.scale.setScalar(scale)
    }
  })

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (isDragging) {
        onDrag(new THREE.Vector3(e.point.x, 0, e.point.z))
      }
    },
    [isDragging, onDrag],
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <group position={well.position}>
      {/* Core */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color={well.color} />
      </mesh>

      {/* Glow rings */}
      {[1, 1.5, 2].map((scale, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[scale * 0.3, scale * 0.35, 32]} />
          <meshBasicMaterial color={well.color} transparent opacity={0.3 - i * 0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Strength indicator */}
      <Text position={[0, 0.6, 0]} fontSize={0.15} color="#ffffff">
        {well.strength.toFixed(1)}x
      </Text>
    </group>
  )
}

function Particles({ wells }: { wells: GravityWellData[] }) {
  const count = 2000
  const pointsRef = useRef<THREE.Points>(null)

  // Initialize particles
  const { positions, velocities, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      // Random position in a disc
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 8 + 2
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.5
      pos[i * 3 + 2] = Math.sin(angle) * radius

      // Random initial velocity
      vel[i * 3] = (Math.random() - 0.5) * 0.02
      vel[i * 3 + 1] = 0
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02

      // White particles
      col[i * 3] = 1
      col[i * 3 + 1] = 1
      col[i * 3 + 2] = 1
    }

    return { positions: pos, velocities: vel, colors: col }
  }, [])

  useFrame(({ delta }) => {
    if (!pointsRef.current) return

    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const col = pointsRef.current.geometry.attributes.color.array as Float32Array

    for (let i = 0; i < count; i++) {
      const ix = i * 3
      const iy = i * 3 + 1
      const iz = i * 3 + 2

      // Calculate gravity from all wells
      let ax = 0,
        az = 0

      wells.forEach((well) => {
        const dx = well.position.x - pos[ix]
        const dz = well.position.z - pos[iz]
        const distSq = dx * dx + dz * dz + 0.1
        const dist = Math.sqrt(distSq)

        // Gravity force
        const force = (well.strength * 0.5) / distSq
        ax += (dx / dist) * force
        az += (dz / dist) * force

        // Color particles near wells
        if (dist < 2) {
          const wellColor = new THREE.Color(well.color)
          const t = 1 - dist / 2
          col[ix] = THREE.MathUtils.lerp(col[ix], wellColor.r, t * 0.1)
          col[iy] = THREE.MathUtils.lerp(col[iy], wellColor.g, t * 0.1)
          col[iz] = THREE.MathUtils.lerp(col[iz], wellColor.b, t * 0.1)
        }
      })

      // Update velocity with acceleration
      velocities[ix] += ax * delta
      velocities[iz] += az * delta

      // Damping
      velocities[ix] *= 0.99
      velocities[iz] *= 0.99

      // Update position
      pos[ix] += velocities[ix]
      pos[iy] *= 0.98 // Flatten to plane
      pos[iz] += velocities[iz]

      // Fade colors back to white
      col[ix] = THREE.MathUtils.lerp(col[ix], 1, 0.01)
      col[iy] = THREE.MathUtils.lerp(col[iy], 1, 0.01)
      col[iz] = THREE.MathUtils.lerp(col[iz], 1, 0.01)

      // Respawn if too far
      const r = Math.sqrt(pos[ix] * pos[ix] + pos[iz] * pos[iz])
      if (r > 15) {
        const angle = Math.random() * Math.PI * 2
        const newR = Math.random() * 3 + 10
        pos[ix] = Math.cos(angle) * newR
        pos[iz] = Math.sin(angle) * newR
        velocities[ix] = (Math.random() - 0.5) * 0.02
        velocities[iz] = (Math.random() - 0.5) * 0.02
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.color.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.8} />
    </points>
  )
}

function Scene() {
  const [wells, setWells] = useState<GravityWellData[]>([
    { position: new THREE.Vector3(-3, 0, 0), strength: 2, color: '#e74c3c' },
    { position: new THREE.Vector3(3, 0, 0), strength: 2, color: '#3498db' },
    { position: new THREE.Vector3(0, 0, 3), strength: 1.5, color: '#2ecc71' },
  ])

  const { wellStrength } = useControls({
    wellStrength: { value: 2, min: 0.5, max: 5, step: 0.1, label: 'Well Strength' },
  })

  // Update all wells with new strength
  const adjustedWells = wells.map((w) => ({ ...w, strength: wellStrength }))

  const handleWellDrag = useCallback((index: number, position: THREE.Vector3) => {
    setWells((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], position }
      return next
    })
  }, [])

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />

      <Particles wells={adjustedWells} />

      {adjustedWells.map((well, i) => (
        <GravityWellMarker key={i} well={well} onDrag={(pos) => handleWellDrag(i, pos)} />
      ))}

      {/* Grid */}
      <gridHelper args={[30, 30, '#222', '#111']} position={[0, -0.1, 0]} />

      {/* Instructions */}
      <Text position={[0, 4, 0]} fontSize={0.3} color="#ffffff">
        Drag gravity wells to attract particles
      </Text>

      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={20}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  )
}

export default function GravityWell() {
  return (
    <Canvas renderer camera={{ position: [0, 12, 12], fov: 50 }}>
      <color attach="background" args={['#0a0a0a']} />
      <Scene />
    </Canvas>
  )
}
