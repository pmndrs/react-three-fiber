/**
 * Demo: Occlusion Reveal
 * Features: onOccluded
 *
 * Hidden messages only visible when occluded.
 * "Look away to see the secret."
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { OrbitControls, Text } from '@react-three/drei'
import { Float } from '@/shared/Float'
import { useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

function SecretMessage({
  position,
  message,
  color,
}: {
  position: [number, number, number]
  message: string
  color: string
}) {
  const [isOccluded, setIsOccluded] = useState(false)
  const [wasRevealed, setWasRevealed] = useState(false)
  const groupRef = useRef<THREE.Group>(null)

  const handleOccluded = useCallback((occluded: boolean) => {
    setIsOccluded(occluded)
    if (occluded) {
      setWasRevealed(true)
    }
  }, [])

  // Simulate occlusion check with raycasting
  const { camera, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())

  useFrame(() => {
    if (groupRef.current) {
      // Check if object is visible from camera
      const direction = new THREE.Vector3()
      groupRef.current.getWorldPosition(direction)
      direction.sub(camera.position).normalize()

      raycaster.current.set(camera.position, direction)
      const intersects = raycaster.current.intersectObjects(scene.children, true)

      // If first intersect is not our object, we're occluded
      if (intersects.length > 0) {
        const firstHit = intersects[0].object
        const isHidden = !firstHit.parent?.uuid.includes(groupRef.current.uuid)
        // For demo purposes, we'll use hover state instead
      }
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Marker sphere - always visible */}
      <mesh
        // @ts-ignore - onOccluded is v10 feature
        onOccluded={handleOccluded}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={wasRevealed ? color : '#666666'}
          emissive={isOccluded ? color : '#000000'}
          emissiveIntensity={isOccluded ? 0.5 : 0}
        />
      </mesh>

      {/* Secret message - only shows when occluded or revealed */}
      {(isOccluded || wasRevealed) && (
        <Float speed={2} rotationIntensity={0.2}>
          <Text position={[0, 0.5, 0]} fontSize={0.2} color={color} anchorX="center" anchorY="middle">
            {message}
          </Text>
        </Float>
      )}

      {/* Hint text */}
      {!wasRevealed && (
        <Text position={[0, -0.4, 0]} fontSize={0.1} color="#888888" anchorX="center">
          (hide me to reveal)
        </Text>
      )}
    </group>
  )
}

function OccludingWall() {
  const [position, setPosition] = useState<[number, number, number]>([0, 1, 2])
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ pointer }) => {
    if (meshRef.current) {
      // Wall follows mouse slightly
      meshRef.current.position.x = pointer.x * 2
      meshRef.current.position.y = 1 + pointer.y * 0.5
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[2, 2, 0.1]} />
      <meshStandardMaterial color="#2d2d2d" transparent opacity={0.9} />
      <Text position={[0, 0, 0.06]} fontSize={0.15} color="#ffffff">
        Move me to hide secrets
      </Text>
      <Text position={[0, -0.25, 0.06]} fontSize={0.08} color="#888888">
        (follows mouse)
      </Text>
    </mesh>
  )
}

function Scene() {
  const secrets = [
    { position: [-2, 1, -1] as [number, number, number], message: 'The cake is a lie', color: '#e74c3c' },
    { position: [2, 1.5, -1] as [number, number, number], message: 'Look behind you!', color: '#3498db' },
    { position: [0, 0.5, -2] as [number, number, number], message: '42', color: '#2ecc71' },
    { position: [-1, 2, -1.5] as [number, number, number], message: 'Hello World', color: '#f39c12' },
    { position: [1.5, 0.8, -0.5] as [number, number, number], message: 'Found me!', color: '#9b59b6' },
  ]

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} />

      {/* Secret messages scattered around */}
      {secrets.map((secret, i) => (
        <SecretMessage key={i} {...secret} />
      ))}

      {/* Moveable occluding wall */}
      <OccludingWall />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Instructions */}
      <Text position={[0, 3, -3]} fontSize={0.25} color="#ffffff" anchorX="center">
        Occlusion Reveal
      </Text>
      <Text position={[0, 2.6, -3]} fontSize={0.12} color="#888888" anchorX="center">
        Move the wall to hide the spheres and reveal their secrets
      </Text>

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={12}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  )
}

export default function OcclusionReveal() {
  return (
    <Canvas renderer camera={{ position: [0, 2, 6], fov: 50 }}>
      <Scene />
    </Canvas>
  )
}
