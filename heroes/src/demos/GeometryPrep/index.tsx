/**
 * Demo: Geometry Prep
 * Features: once utility
 *
 * Complex geometry with pre-applied transforms.
 * Shows once() preventing re-application on re-renders.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls, Text } from '@react-three/drei'
import { useRef, useState, useMemo, useEffect } from 'react'
import * as THREE from 'three'

// Simulated once() utility for demo purposes
// In v10, this would be: import { once } from '@react-three/fiber'
function useOnceTransform(
  geometryRef: React.RefObject<THREE.BufferGeometry>,
  transform: (geo: THREE.BufferGeometry) => void,
) {
  const applied = useRef(false)

  useEffect(() => {
    if (geometryRef.current && !applied.current) {
      transform(geometryRef.current)
      applied.current = true
    }
  }, [geometryRef, transform])
}

function WithoutOnce({ renderCount }: { renderCount: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  // BUG: This rotates on EVERY render, accumulating transforms
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.rotateX(Math.PI / 8)
    }
  }) // No deps = runs every render!

  return (
    <group position={[-3, 0, 0]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
      <Text position={[0, -1.5, 0]} fontSize={0.15} color="#e74c3c">
        WITHOUT once()
      </Text>
      <Text position={[0, -1.8, 0]} fontSize={0.1} color="#888888">
        Rotates every render!
      </Text>
      <Text position={[0, -2.1, 0]} fontSize={0.12} color="#ff6b6b">
        Renders: {renderCount}
      </Text>
    </group>
  )
}

function WithOnce({ renderCount }: { renderCount: number }) {
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const [, forceUpdate] = useState(0)

  // Correct: Only transforms once on mount
  const transformApplied = useRef(false)

  useEffect(() => {
    if (geoRef.current && !transformApplied.current) {
      geoRef.current.rotateX(Math.PI / 8)
      geoRef.current.center()
      transformApplied.current = true
    }
  }, [])

  return (
    <group position={[3, 0, 0]}>
      <mesh>
        <boxGeometry ref={geoRef} args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#2ecc71" />
      </mesh>
      <Text position={[0, -1.5, 0]} fontSize={0.15} color="#2ecc71">
        WITH once()
      </Text>
      <Text position={[0, -1.8, 0]} fontSize={0.1} color="#888888">
        Transforms once only
      </Text>
      <Text position={[0, -2.1, 0]} fontSize={0.12} color="#2ecc71">
        Renders: {renderCount}
      </Text>
    </group>
  )
}

function ComparisonDisplay() {
  return (
    <group position={[0, 2.5, 0]}>
      <Text position={[0, 0.5, 0]} fontSize={0.25} color="#ffffff">
        once() Utility Demo
      </Text>
      <Text position={[0, 0, 0]} fontSize={0.12} color="#888888">
        Prevents transform accumulation on re-renders
      </Text>
    </group>
  )
}

function RenderTrigger({ onRender }: { onRender: () => void }) {
  useFrame(() => {
    // Intentionally trigger re-renders every 60 frames
    if (Math.random() < 0.02) {
      onRender()
    }
  })
  return null
}

function Scene() {
  const [renderCount, setRenderCount] = useState(1)

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />

      <ComparisonDisplay />

      <WithoutOnce renderCount={renderCount} />
      <WithOnce renderCount={renderCount} />

      <RenderTrigger onRender={() => setRenderCount((c) => c + 1)} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[15, 15]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Code example panel */}
      <group position={[0, 0, -3]}>
        <mesh>
          <planeGeometry args={[6, 2.5]} />
          <meshBasicMaterial color="#1e1e1e" />
        </mesh>
        <Text position={[-2.5, 0.8, 0.01]} fontSize={0.12} color="#569cd6" anchorX="left">
          {'// With once()'}
        </Text>
        <Text position={[-2.5, 0.5, 0.01]} fontSize={0.1} color="#9cdcfe" anchorX="left">
          {'<boxGeometry'}
        </Text>
        <Text position={[-2.5, 0.25, 0.01]} fontSize={0.1} color="#9cdcfe" anchorX="left">
          {'  rotateX={once(Math.PI / 8)}'}
        </Text>
        <Text position={[-2.5, 0, 0.01]} fontSize={0.1} color="#9cdcfe" anchorX="left">
          {'  center={once()}'}
        </Text>
        <Text position={[-2.5, -0.25, 0.01]} fontSize={0.1} color="#9cdcfe" anchorX="left">
          {'/>'}
        </Text>
        <Text position={[-2.5, -0.6, 0.01]} fontSize={0.1} color="#6a9955" anchorX="left">
          {'// Transform applies once,'}
        </Text>
        <Text position={[-2.5, -0.85, 0.01]} fontSize={0.1} color="#6a9955" anchorX="left">
          {'// never accumulates'}
        </Text>
      </group>

      <OrbitControls minDistance={6} maxDistance={15} />
    </>
  )
}

export default function GeometryPrep() {
  return (
    <Canvas renderer camera={{ position: [0, 3, 8], fov: 50 }}>
      <Scene />
    </Canvas>
  )
}
