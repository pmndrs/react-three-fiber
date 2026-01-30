/**
 * Demo: Morphing Gallery
 * Features: useNodes, fromRef, once
 *
 * Art gallery where sculptures morph between forms.
 * Click to cycle through shapes. Uses fromRef for spotlight targets.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls, Text, MeshTransmissionMaterial } from '@react-three/drei'
import { useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

const SHAPES = ['box', 'sphere', 'torus', 'cone', 'dodecahedron'] as const
type ShapeType = (typeof SHAPES)[number]

function getGeometry(shape: ShapeType) {
  switch (shape) {
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1)
    case 'sphere':
      return new THREE.SphereGeometry(0.6, 32, 32)
    case 'torus':
      return new THREE.TorusGeometry(0.5, 0.2, 16, 48)
    case 'cone':
      return new THREE.ConeGeometry(0.5, 1, 32)
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(0.6)
    default:
      return new THREE.BoxGeometry(1, 1, 1)
  }
}

interface SculptureProps {
  position: [number, number, number]
  color: string
  initialShape: ShapeType
  label: string
}

function Sculpture({ position, color, initialShape, label }: SculptureProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [shapeIndex, setShapeIndex] = useState(SHAPES.indexOf(initialShape))
  const [isAnimating, setIsAnimating] = useState(false)
  const scaleRef = useRef(1)

  const currentShape = SHAPES[shapeIndex]

  const handleClick = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)
    scaleRef.current = 0
  }, [isAnimating])

  useFrame(({ delta }) => {
    if (meshRef.current) {
      // Gentle rotation
      meshRef.current.rotation.y += delta * 0.3

      // Morph animation
      if (isAnimating) {
        scaleRef.current += delta * 3

        if (scaleRef.current >= 1) {
          scaleRef.current = 1
          setIsAnimating(false)
        } else if (scaleRef.current < 0.5) {
          // Shrinking phase
          meshRef.current.scale.setScalar(1 - scaleRef.current * 2)
        } else if (scaleRef.current === 0.5) {
          // Switch shape at midpoint
          setShapeIndex((prev) => (prev + 1) % SHAPES.length)
        } else {
          // Growing phase
          meshRef.current.scale.setScalar((scaleRef.current - 0.5) * 2)
        }
      }
    }
  })

  return (
    <group position={position}>
      {/* Pedestal */}
      <mesh position={[0, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.7, 0.5, 32]} />
        <meshStandardMaterial color="#2d2d2d" roughness={0.8} />
      </mesh>

      {/* Sculpture */}
      <mesh ref={meshRef} position={[0, 0.5, 0]} geometry={getGeometry(currentShape)} onClick={handleClick} castShadow>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Label */}
      <Text position={[0, -1.2, 0.7]} fontSize={0.12} color="#ffffff" anchorX="center">
        {label}
      </Text>
      <Text position={[0, -1.35, 0.7]} fontSize={0.08} color="#888888" anchorX="center">
        Click to morph
      </Text>

      {/* Spotlight pointing at sculpture */}
      <spotLight
        position={[0, 4, 2]}
        target={meshRef.current || undefined}
        intensity={30}
        angle={0.4}
        penumbra={0.5}
        castShadow
      />
    </group>
  )
}

function GalleryFloor() {
  return (
    <>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Gallery walls */}
      <mesh position={[0, 2, -5]}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#252525" />
      </mesh>

      {/* Side walls */}
      <mesh position={[-8, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[15, 8]} />
        <meshStandardMaterial color="#252525" />
      </mesh>
      <mesh position={[8, 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[15, 8]} />
        <meshStandardMaterial color="#252525" />
      </mesh>
    </>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />

      {/* Sculptures */}
      <Sculpture position={[-4, 0, 0]} color="#e74c3c" initialShape="sphere" label="Crimson Flow" />
      <Sculpture position={[0, 0, 0]} color="#3498db" initialShape="torus" label="Azure Cycle" />
      <Sculpture position={[4, 0, 0]} color="#2ecc71" initialShape="dodecahedron" label="Emerald Form" />

      <GalleryFloor />

      {/* Gallery title */}
      <Text position={[0, 3.5, -4.9]} fontSize={0.4} color="#ffffff" anchorX="center">
        MORPHING GALLERY
      </Text>
      <Text position={[0, 3, -4.9]} fontSize={0.15} color="#666666" anchorX="center">
        Interactive Digital Sculptures
      </Text>

      <OrbitControls target={[0, 0.5, 0]} minDistance={5} maxDistance={15} maxPolarAngle={Math.PI / 2} />
    </>
  )
}

export default function MorphingGallery() {
  return (
    <Canvas renderer camera={{ position: [0, 2, 8], fov: 50 }} shadows>
      <Scene />
    </Canvas>
  )
}
