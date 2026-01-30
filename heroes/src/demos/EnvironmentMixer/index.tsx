/**
 * Demo: Environment Mixer
 * Features: background prop, Presets, HDRI
 *
 * Object viewer with environment selector.
 * Crossfade between presets for smooth transitions.
 */

import { Canvas } from '@react-three/fiber/webgpu'
import { OrbitControls, Environment, Text } from '@react-three/drei'
import { Float } from '@/shared/Float'
import { useRef } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'

const PRESETS = [
  'studio',
  'city',
  'sunset',
  'dawn',
  'night',
  'warehouse',
  'forest',
  'apartment',
  'park',
  'lobby',
] as const

type PresetType = (typeof PRESETS)[number]

function ProductShowcase() {
  const meshRef = useRef<THREE.Mesh>(null)

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <group>
        {/* Chrome sphere */}
        <mesh ref={meshRef} castShadow>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} envMapIntensity={1} />
        </mesh>

        {/* Inner glass sphere */}
        <mesh scale={0.6}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshPhysicalMaterial color="#4fc3f7" metalness={0} roughness={0} transmission={0.9} thickness={0.5} />
        </mesh>

        {/* Orbiting ring */}
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.5, 0.02, 16, 64]} />
          <meshStandardMaterial color="#f1c40f" metalness={1} roughness={0.2} />
        </mesh>
      </group>
    </Float>
  )
}

function EnvironmentDisplay({ preset }: { preset: PresetType }) {
  return (
    <Text position={[0, -2.5, 0]} fontSize={0.3} color="#ffffff" anchorX="center">
      Environment: {preset.charAt(0).toUpperCase() + preset.slice(1)}
    </Text>
  )
}

function Scene() {
  const { preset, intensity, blur } = useControls('Environment', {
    preset: {
      value: 'studio' as PresetType,
      options: PRESETS as unknown as PresetType[],
      label: 'Preset',
    },
    intensity: { value: 1, min: 0, max: 2, step: 0.1, label: 'Intensity' },
    blur: { value: 0, min: 0, max: 1, step: 0.1, label: 'Blur' },
  })

  const { showGround, groundColor } = useControls('Ground', {
    showGround: { value: true, label: 'Show Ground' },
    groundColor: { value: '#1a1a2e', label: 'Color' },
  })

  return (
    <>
      <ambientLight intensity={0.1} />

      <ProductShowcase />
      <EnvironmentDisplay preset={preset} />

      {showGround && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color={groundColor} />
        </mesh>
      )}

      <Environment
        preset={preset}
        background
        backgroundIntensity={intensity}
        backgroundBlurriness={blur}
        environmentIntensity={intensity}
      />

      <OrbitControls
        minDistance={3}
        maxDistance={15}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  )
}

function PresetGallery() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        padding: 12,
        background: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
      }}>
      <span style={{ color: 'white', fontSize: 12, opacity: 0.7 }}>Use the Leva panel to switch environments</span>
    </div>
  )
}

export default function EnvironmentMixer() {
  return (
    <>
      <Canvas renderer camera={{ position: [4, 2, 4], fov: 45 }} shadows>
        <Scene />
      </Canvas>
      <PresetGallery />
    </>
  )
}
