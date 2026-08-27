/**
 * useFrame FPS Throttling Demo
 *
 * Three rotating cubes demonstrating FPS throttling:
 * - Green cube: No limit (60fps)
 * - Yellow cube: 15fps
 * - Red cube: 5fps
 *
 * Visually shows how FPS throttling affects animation smoothness.
 */

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { color, mix, sin, time } from 'three/tsl'
import * as THREE from 'three'

//* FPS Cube Component ==============================

interface FPSCubeProps {
  fps?: number
  baseColor: string
  position: [number, number, number]
  label: string
}

function FPSCube({ fps, baseColor, position, label }: FPSCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  // TSL color node - shifts hue slightly over time
  const colorNode = useMemo(() => {
    const base = color(baseColor)
    const highlight = color('white')
    // Subtle pulse effect
    const pulse = sin(time.mul(3)).mul(0.1).add(0.9)
    return mix(highlight, base, pulse)
  }, [baseColor])

  const labelTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64

    const context = canvas.getContext('2d')!
    context.fillStyle = baseColor
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'white'
    context.font = '600 28px system-ui, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(label, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [baseColor, label])

  useEffect(() => () => labelTexture.dispose(), [labelTexture])

  // Rotate the cube each frame, throttled by FPS option
  useFrame(
    (state, delta) => {
      meshRef.current.rotation.x += delta * 1.5
      meshRef.current.rotation.y += delta * 2
    },
    { fps, id: `cube-${fps ?? 'unlimited'}` },
  )

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardNodeMaterial colorNode={colorNode} roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Label below cube */}
      <mesh position={[0, -1.5, 0]}>
        <planeGeometry args={[1.8, 0.5]} />
        <meshBasicMaterial map={labelTexture} toneMapped={false} />
      </mesh>
    </group>
  )
}

//* Info Panel ==============================

function InfoPanel() {
  return (
    <group position={[0, 2.5, 0]}>
      <mesh>
        <planeGeometry args={[6.5, 1]} />
        <meshBasicMaterial color="#222" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

//* Scene ==============================

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {/* Three cubes at different FPS rates */}
      <FPSCube fps={undefined} baseColor="#22c55e" position={[-2.25, 0, 0]} label="60 FPS" />
      <FPSCube fps={15} baseColor="#eab308" position={[0, 0, 0]} label="15 FPS" />
      <FPSCube fps={5} baseColor="#ef4444" position={[2.25, 0, 0]} label="5 FPS" />

      <InfoPanel />
    </>
  )
}

//* Main Export ==============================

export default function useFrameFPS() {
  return (
    <Canvas renderer camera={{ position: [0, 0, 8], fov: 50 }}>
      <Scene />
    </Canvas>
  )
}
