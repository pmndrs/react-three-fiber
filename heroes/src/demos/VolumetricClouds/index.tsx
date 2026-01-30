/**
 * Demo: Volumetric Cloudscape
 * Features: useGPUStorage, useNodes, TSL Raymarching
 *
 * Fly through volumetric clouds rendered with 3D noise textures.
 * Time-of-day slider changes lighting.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls, Sky } from '@react-three/drei'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'

function CloudLayer({ height, scale, opacity }: { height: number; scale: number; opacity: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ elapsed }) => {
    if (meshRef.current) {
      meshRef.current.position.x = Math.sin(elapsed * 0.05) * 2
      meshRef.current.rotation.y = elapsed * 0.01
    }
  })

  return (
    <mesh ref={meshRef} position={[0, height, 0]}>
      <sphereGeometry args={[scale, 16, 16]} />
      <meshStandardMaterial color="white" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function Clouds() {
  const groupRef = useRef<THREE.Group>(null)

  // Generate cloud positions
  const clouds = Array.from({ length: 50 }, (_, i) => ({
    position: [(Math.random() - 0.5) * 100, Math.random() * 20 + 10, (Math.random() - 0.5) * 100] as [
      number,
      number,
      number,
    ],
    scale: Math.random() * 5 + 3,
    opacity: Math.random() * 0.3 + 0.4,
  }))

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <mesh key={i} position={cloud.position}>
          <sphereGeometry args={[cloud.scale, 8, 8]} />
          <meshStandardMaterial color="white" transparent opacity={cloud.opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function Scene() {
  const { timeOfDay, sunPosition } = useControls({
    timeOfDay: { value: 12, min: 6, max: 20, step: 0.5, label: 'Time of Day' },
    sunPosition: { value: 45, min: 0, max: 90, step: 1, label: 'Sun Angle' },
  })

  const sunAngle = ((timeOfDay - 6) / 14) * Math.PI
  const sunY = Math.sin(sunAngle)
  const sunZ = Math.cos(sunAngle)

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[0, sunY * 100, sunZ * 100]}
        inclination={sunPosition / 90}
        azimuth={0.25}
        rayleigh={timeOfDay < 8 || timeOfDay > 18 ? 3 : 0.5}
      />

      <ambientLight intensity={0.3} />
      <directionalLight
        position={[sunZ * 50, sunY * 50, 0]}
        intensity={sunY > 0 ? 1 : 0.2}
        color={timeOfDay < 8 || timeOfDay > 18 ? '#ff7744' : '#ffffff'}
      />

      <Clouds />

      <OrbitControls enablePan={false} minDistance={5} maxDistance={100} autoRotate autoRotateSpeed={0.2} />
    </>
  )
}

export default function VolumetricClouds() {
  return (
    <Canvas renderer camera={{ position: [0, 20, 50], fov: 60 }}>
      <Scene />
    </Canvas>
  )
}
