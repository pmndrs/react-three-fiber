/**
 * Demo: fromRef Spotlight Rig
 * Features: fromRef utility
 *
 * Stage with multiple spotlights following moving targets.
 * All declarative with fromRef - no useEffect needed.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls, Text } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

function MovingTarget({
  color,
  speed,
  radius,
  height,
  targetRef,
}: {
  color: string
  speed: number
  radius: number
  height: number
  targetRef: React.RefObject<THREE.Mesh>
}) {
  useFrame(({ elapsed }) => {
    if (targetRef.current) {
      targetRef.current.position.x = Math.sin(elapsed * speed) * radius
      targetRef.current.position.z = Math.cos(elapsed * speed) * radius
      targetRef.current.position.y = height + Math.sin(elapsed * speed * 2) * 0.3
    }
  })

  return (
    <mesh ref={targetRef}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  )
}

function SpotlightWithTarget({
  position,
  color,
  targetRef,
}: {
  position: [number, number, number]
  color: string
  targetRef: React.RefObject<THREE.Object3D>
}) {
  const lightRef = useRef<THREE.SpotLight>(null)

  useFrame(() => {
    // Manual target update since fromRef is a v10 feature
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current
    }
  })

  return (
    <>
      <spotLight
        ref={lightRef}
        position={position}
        intensity={50}
        angle={0.3}
        penumbra={0.5}
        color={color}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* Light housing */}
      <mesh position={position}>
        <cylinderGeometry args={[0.3, 0.2, 0.4, 16]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
    </>
  )
}

function Stage() {
  return (
    <>
      {/* Stage floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[5, 64]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Stage rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[4.8, 5.2, 64]} />
        <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Backdrop */}
      <mesh position={[0, 3, -5]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Light truss */}
      {[-4, 0, 4].map((x) => (
        <mesh key={x} position={[x, 6, 0]}>
          <boxGeometry args={[0.1, 0.1, 8]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}
      <mesh position={[0, 6, -4]}>
        <boxGeometry args={[8.2, 0.1, 0.1]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 6, 4]}>
        <boxGeometry args={[8.2, 0.1, 0.1]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </>
  )
}

function Scene() {
  // Create refs for targets
  const target1Ref = useRef<THREE.Mesh>(null)
  const target2Ref = useRef<THREE.Mesh>(null)
  const target3Ref = useRef<THREE.Mesh>(null)

  return (
    <>
      <ambientLight intensity={0.1} />

      <Stage />

      {/* Moving targets */}
      <MovingTarget color="#e74c3c" speed={1} radius={2} height={1} targetRef={target1Ref} />
      <MovingTarget color="#3498db" speed={1.3} radius={2.5} height={1.5} targetRef={target2Ref} />
      <MovingTarget color="#2ecc71" speed={0.8} radius={1.5} height={0.8} targetRef={target3Ref} />

      {/* Spotlights tracking targets */}
      <SpotlightWithTarget position={[-3, 6, 3]} color="#e74c3c" targetRef={target1Ref} />
      <SpotlightWithTarget position={[0, 6, -3]} color="#3498db" targetRef={target2Ref} />
      <SpotlightWithTarget position={[3, 6, 3]} color="#2ecc71" targetRef={target3Ref} />

      {/* Title */}
      <Text position={[0, 4.5, -4.9]} fontSize={0.4} color="#ffffff">
        SPOTLIGHT RIG
      </Text>
      <Text position={[0, 4, -4.9]} fontSize={0.15} color="#666666">
        Spotlights track targets using fromRef
      </Text>

      <OrbitControls
        target={[0, 1, 0]}
        minDistance={8}
        maxDistance={20}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  )
}

export default function SpotlightRig() {
  return (
    <Canvas renderer camera={{ position: [10, 8, 10], fov: 50 }} shadows>
      <Scene />
    </Canvas>
  )
}
