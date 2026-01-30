/**
 * Demo: Terrain Table
 * Features: useNodes, useBuffers, Scheduler Phases
 *
 * Miniature procedural terrain on a desk, like a hologram or diorama.
 * Terrain erodes/generates in real-time at throttled fps.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls, Environment } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'

function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { speed, amplitude, detail } = useControls({
    speed: { value: 0.5, min: 0, max: 2, step: 0.1 },
    amplitude: { value: 0.5, min: 0.1, max: 1, step: 0.1 },
    detail: { value: 64, min: 16, max: 128, step: 16 },
  })

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(4, 4, detail, detail)
    return geo
  }, [detail])

  useFrame(({ elapsed }) => {
    if (meshRef.current) {
      const geo = meshRef.current.geometry
      const positions = geo.attributes.position
      const time = elapsed * speed

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i)
        const y = positions.getY(i)

        // Procedural noise-like terrain
        const height =
          Math.sin(x * 2 + time) * 0.3 + Math.sin(y * 3 + time * 0.7) * 0.2 + Math.sin(x * y + time * 0.5) * 0.15

        positions.setZ(i, height * amplitude)
      }

      positions.needsUpdate = true
      geo.computeVertexNormals()
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#4a7c59" wireframe={false} side={THREE.DoubleSide} flatShading />
    </mesh>
  )
}

function Desk() {
  return (
    <group>
      {/* Desk surface */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[8, 0.2, 6]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </mesh>

      {/* Desk legs */}
      {[
        [-3.5, -1.5, -2.5],
        [3.5, -1.5, -2.5],
        [-3.5, -1.5, 2.5],
        [3.5, -1.5, 2.5],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 2]} />
          <meshStandardMaterial color="#5c3317" />
        </mesh>
      ))}
    </group>
  )
}

function HologramBase() {
  return (
    <group position={[0, 0, 0]}>
      {/* Projector base */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[2.5, 2.8, 0.3, 32]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Glow ring */}
      <mesh position={[0, -0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.5, 64]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
      </mesh>

      {/* Grid lines on terrain */}
      <gridHelper args={[4, 20, '#00ffff', '#004444']} position={[0, 0.01, 0]} rotation={[0, 0, 0]} />
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[0, 2, 0]} intensity={0.5} color="#00ffff" />

      <group position={[0, 0.5, 0]}>
        <HologramBase />
        <Terrain />
      </group>

      <Desk />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      <OrbitControls minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.2} minDistance={4} maxDistance={12} />
    </>
  )
}

export default function TerrainTable() {
  return (
    <Canvas renderer camera={{ position: [5, 4, 5], fov: 45 }} shadows>
      <Scene />
    </Canvas>
  )
}
