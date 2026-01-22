import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { useRef } from 'react'
import * as THREE from 'three/webgpu'

/**
 * Multi-Canvas WebGPU Demo
 *
 * Demonstrates sharing a single WebGPURenderer across multiple Canvas components
 * using the `id` and `primaryCanvas` props with Three.js CanvasTarget API.
 *
 * - Primary canvas: has `id` prop, creates and owns the WebGPURenderer
 * - Secondary canvases: have `primaryCanvas` prop, share the primary's renderer
 *
 * Each canvas maintains its own scene, camera, and events.
 */

function RotatingBox({ color = 'orange' }: { color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    meshRef.current.rotation.x += delta
    meshRef.current.rotation.y += delta * 0.5
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function RotatingSphere({ color = 'hotpink' }: { color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    meshRef.current.rotation.y += delta * 0.8
    meshRef.current.position.y = Math.sin(Date.now() * 0.002) * 0.3
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function RotatingTorus({ color = 'cyan' }: { color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    meshRef.current.rotation.x += delta * 0.5
    meshRef.current.rotation.z += delta
  })

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[0.5, 0.2, 16, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function CanvasInfo() {
  const { internal } = useThree()
  const isSecondary = internal.isSecondary
  const isMultiCanvas = internal.isMultiCanvas

  return (
    <group position={[0, -1.2, 0]}>
      <mesh>
        <planeGeometry args={[2, 0.4]} />
        <meshBasicMaterial color={isSecondary ? '#333' : '#222'} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

export default function WebGPUMultiCanvas() {
  return (
    <div style={{ display: 'flex', gap: '10px', width: '100%', height: '100%', padding: '10px' }}>
      {/* Primary Canvas - creates the WebGPURenderer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'white', marginBottom: '5px', fontSize: '12px' }}>
          Primary Canvas (id="main") - Owns Renderer
        </div>
        <div style={{ flex: 1, border: '2px solid #4a4', borderRadius: '8px', overflow: 'hidden' }}>
          <Canvas id="main" renderer>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <RotatingBox color="orange" />
            <CanvasInfo />
          </Canvas>
        </div>
      </div>

      {/* Secondary Canvas 1 - shares the renderer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'white', marginBottom: '5px', fontSize: '12px' }}>
          Secondary Canvas (primaryCanvas="main") - Shares Renderer
        </div>
        <div style={{ flex: 1, border: '2px solid #a4a', borderRadius: '8px', overflow: 'hidden' }}>
          <Canvas primaryCanvas="main" renderer>
            <ambientLight intensity={0.5} />
            <directionalLight position={[-5, 5, 5]} intensity={1} />
            <RotatingSphere color="hotpink" />
            <CanvasInfo />
          </Canvas>
        </div>
      </div>

      {/* Secondary Canvas 2 - also shares the renderer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'white', marginBottom: '5px', fontSize: '12px' }}>
          Secondary Canvas (primaryCanvas="main") - Shares Renderer
        </div>
        <div style={{ flex: 1, border: '2px solid #4aa', borderRadius: '8px', overflow: 'hidden' }}>
          <Canvas primaryCanvas="main" renderer>
            <ambientLight intensity={0.5} />
            <directionalLight position={[0, 5, -5]} intensity={1} />
            <RotatingTorus color="cyan" />
            <CanvasInfo />
          </Canvas>
        </div>
      </div>
    </div>
  )
}
