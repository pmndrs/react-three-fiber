/**
 * Custom Float component compatible with R3F v10
 * Replaces drei's Float which uses deprecated clock.elapsedTime
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FloatProps {
  children: React.ReactNode
  speed?: number
  rotationIntensity?: number
  floatIntensity?: number
  floatingRange?: [number, number]
}

export function Float({
  children,
  speed = 1,
  rotationIntensity = 1,
  floatIntensity = 1,
  floatingRange = [-0.1, 0.1],
}: FloatProps) {
  const groupRef = useRef<THREE.Group>(null)
  const offset = useRef(Math.random() * 10000)

  useFrame(({ elapsed }) => {
    if (!groupRef.current) return

    const t = offset.current + elapsed * speed

    // Float up and down
    const floatY = Math.sin(t) * floatIntensity * (floatingRange[1] - floatingRange[0])
    groupRef.current.position.y = floatY

    // Gentle rotation
    groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.1 * rotationIntensity
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.1 * rotationIntensity
    groupRef.current.rotation.z = Math.sin(t * 0.4) * 0.05 * rotationIntensity
  })

  return <group ref={groupRef}>{children}</group>
}
