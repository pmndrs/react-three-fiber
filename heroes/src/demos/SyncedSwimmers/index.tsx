/**
 * Demo: Synced Swimmers
 * Features: Multi-Canvas, scheduler after
 *
 * Same animation across 3 canvases with intentional delay.
 * Creates a mesmerizing wave/ripple effect.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { useRef } from 'react'
import * as THREE from 'three'

function Swimmer({ delay = 0, color }: { delay?: number; color: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const armLRef = useRef<THREE.Mesh>(null)
  const armRRef = useRef<THREE.Mesh>(null)
  const legLRef = useRef<THREE.Mesh>(null)
  const legRRef = useRef<THREE.Mesh>(null)

  useFrame(({ elapsed }) => {
    const t = elapsed - delay

    if (groupRef.current) {
      // Undulating body motion
      groupRef.current.position.y = Math.sin(t * 2) * 0.1
      groupRef.current.rotation.z = Math.sin(t * 2) * 0.1
    }

    if (bodyRef.current) {
      bodyRef.current.rotation.x = Math.sin(t * 2) * 0.2
    }

    // Arms - backstroke motion
    if (armLRef.current) {
      armLRef.current.rotation.x = Math.sin(t * 3) * 1.2
    }
    if (armRRef.current) {
      armRRef.current.rotation.x = Math.sin(t * 3 + Math.PI) * 1.2
    }

    // Legs - flutter kick
    if (legLRef.current) {
      legLRef.current.rotation.x = Math.sin(t * 6) * 0.4
    }
    if (legRRef.current) {
      legRRef.current.rotation.x = Math.sin(t * 6 + Math.PI) * 0.4
    }
  })

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Body */}
      <mesh ref={bodyRef}>
        <capsuleGeometry args={[0.2, 0.8, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Left Arm */}
      <mesh ref={armLRef} position={[0.25, 0.3, 0]}>
        <capsuleGeometry args={[0.05, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Right Arm */}
      <mesh ref={armRRef} position={[-0.25, 0.3, 0]}>
        <capsuleGeometry args={[0.05, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Left Leg */}
      <mesh ref={legLRef} position={[0.1, -0.6, 0]}>
        <capsuleGeometry args={[0.06, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Right Leg */}
      <mesh ref={legRRef} position={[-0.1, -0.6, 0]}>
        <capsuleGeometry args={[0.06, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

function Pool({ waterColor }: { waterColor: string }) {
  return (
    <>
      {/* Water surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color={waterColor} transparent opacity={0.8} />
      </mesh>

      {/* Pool edges */}
      <mesh position={[0, -0.6, -2]}>
        <boxGeometry args={[4.4, 0.3, 0.2]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      <mesh position={[0, -0.6, 2]}>
        <boxGeometry args={[4.4, 0.3, 0.2]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      <mesh position={[-2.1, -0.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[4, 0.3, 0.2]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      <mesh position={[2.1, -0.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[4, 0.3, 0.2]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>

      {/* Lane lines */}
      {[-1, 0, 1].map((x) => (
        <mesh key={x} position={[x, -0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, 4]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </>
  )
}

function SwimScene({ delay, color, waterColor }: { delay: number; color: string; waterColor: string }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />

      <Swimmer delay={delay} color={color} />
      <Pool waterColor={waterColor} />
    </>
  )
}

export default function SyncedSwimmers() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      {/* Three canvases side by side with different delays */}
      <div style={{ flex: 1, borderRight: '2px solid #333' }}>
        <Canvas id="lane1" renderer camera={{ position: [0, 2, 4], fov: 40 }}>
          <SwimScene delay={0} color="#e74c3c" waterColor="#3498db" />
        </Canvas>
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            color: 'white',
            fontSize: 12,
            background: 'rgba(0,0,0,0.5)',
            padding: '4px 8px',
            borderRadius: 4,
          }}>
          Lane 1 (Lead)
        </div>
      </div>

      <div style={{ flex: 1, borderRight: '2px solid #333', position: 'relative' }}>
        <Canvas
          renderer={{ primaryCanvas: 'lane1', scheduler: { after: 'lane1' } }}
          camera={{ position: [0, 2, 4], fov: 40 }}>
          <SwimScene delay={0.3} color="#2ecc71" waterColor="#1abc9c" />
        </Canvas>
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontSize: 12,
            background: 'rgba(0,0,0,0.5)',
            padding: '4px 8px',
            borderRadius: 4,
          }}>
          Lane 2 (+0.3s delay)
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          renderer={{ primaryCanvas: 'lane1', scheduler: { after: 'lane1' } }}
          camera={{ position: [0, 2, 4], fov: 40 }}>
          <SwimScene delay={0.6} color="#9b59b6" waterColor="#8e44ad" />
        </Canvas>
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            color: 'white',
            fontSize: 12,
            background: 'rgba(0,0,0,0.5)',
            padding: '4px 8px',
            borderRadius: 4,
          }}>
          Lane 3 (+0.6s delay)
        </div>
      </div>
    </div>
  )
}
