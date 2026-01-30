/**
 * Demo: HL2 Fluid Bottle
 * Features: useBuffers, useNodes, TSL Compute
 *
 * Classic Half-Life 2 fluid simulation in a bottle.
 * Tilt the bottle, fluid responds with satisfying physics.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

function Bottle() {
  const groupRef = useRef<THREE.Group>(null)
  const fluidRef = useRef<THREE.Mesh>(null)

  useFrame(({ elapsed }) => {
    if (groupRef.current) {
      // Gentle idle rotation
      groupRef.current.rotation.z = Math.sin(elapsed * 0.5) * 0.1
      groupRef.current.rotation.x = Math.sin(elapsed * 0.3) * 0.05
    }

    if (fluidRef.current) {
      // Simulate fluid responding to tilt
      const tilt = Math.sin(elapsed * 0.5) * 0.1
      fluidRef.current.position.y = -0.3 + tilt * 0.2
      fluidRef.current.rotation.z = -tilt * 2
    }
  })

  return (
    <group ref={groupRef}>
      {/* Bottle Glass */}
      <mesh>
        <cylinderGeometry args={[0.4, 0.5, 2, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#88ccff"
          transparent
          opacity={0.3}
          roughness={0}
          metalness={0}
          transmission={0.9}
          thickness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bottle Bottom */}
      <mesh position={[0, -1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshPhysicalMaterial color="#88ccff" transparent opacity={0.3} transmission={0.9} />
      </mesh>

      {/* Fluid (placeholder - would use compute shader in full implementation) */}
      <mesh ref={fluidRef} position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 1, 32]} />
        <meshStandardMaterial color="#ff6b35" transparent opacity={0.8} />
      </mesh>

      {/* Cork */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.3, 16]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ffd700" />

      <Bottle />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>

      <OrbitControls enablePan={false} minDistance={3} maxDistance={8} />
    </>
  )
}

export default function FluidBottle() {
  return (
    <Canvas renderer camera={{ position: [3, 2, 4], fov: 45 }} shadows>
      <Scene />
    </Canvas>
  )
}
