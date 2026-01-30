/**
 * Demo: Mission Control
 * Features: Multi-Canvas, primaryStore, FPS Throttling
 *
 * Main 3D scene with 4 smaller canvas viewports around edges.
 * Each viewport runs at different fps (minimap, rear camera, stats, radar).
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { OrbitControls, PerspectiveCamera, OrthographicCamera, Text } from '@react-three/drei'
import { useRef, useState } from 'react'
import * as THREE from 'three'

function Spacecraft() {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ elapsed }) => {
    if (ref.current) {
      ref.current.rotation.y = elapsed * 0.2
      ref.current.position.y = Math.sin(elapsed * 0.5) * 0.3
    }
  })

  return (
    <group ref={ref}>
      {/* Main body */}
      <mesh>
        <capsuleGeometry args={[0.3, 1, 8, 16]} />
        <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Wings */}
      <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[1, 0.05, 0.5]} />
        <meshStandardMaterial color="#2d3748" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.8, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[1, 0.05, 0.5]} />
        <meshStandardMaterial color="#2d3748" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Engine glow */}
      <mesh position={[0, -0.7, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
    </group>
  )
}

function Stars() {
  const count = 500
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100
  }

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="white" size={0.1} />
    </points>
  )
}

function Planet({ position, color, size }: { position: [number, number, number]; color: string; size: number }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}

function MainScene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4fc3f7" />

      <Spacecraft />
      <Stars />
      <Planet position={[8, 2, -15]} color="#e57373" size={3} />
      <Planet position={[-12, -4, -20]} color="#64b5f6" size={4} />

      <OrbitControls enableZoom={false} enablePan={false} />
    </>
  )
}

// Minimap view - top down
function MinimapScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <OrthographicCamera makeDefault position={[0, 20, 0]} rotation={[-Math.PI / 2, 0, 0]} zoom={10} />

      {/* Simplified radar blips */}
      <mesh position={[0, 0, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
      <mesh position={[3, 0, -5]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[-4, 0, -8]}>
        <circleGeometry args={[0.6, 16]} />
        <meshBasicMaterial color="#0066ff" />
      </mesh>

      {/* Grid */}
      <gridHelper args={[20, 20, '#004400', '#002200']} rotation={[0, 0, 0]} />
    </>
  )
}

// Stats display
function StatsScene() {
  const [fps] = useState(60)

  return (
    <>
      <color attach="background" args={['#001100']} />
      <ambientLight intensity={1} />
      <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={50} />

      <Text position={[0, 2, 0]} fontSize={0.4} color="#00ff00">
        SYSTEM STATUS
      </Text>
      <Text position={[0, 1, 0]} fontSize={0.25} color="#00cc00">
        FPS: {fps}
      </Text>
      <Text position={[0, 0.5, 0]} fontSize={0.25} color="#00cc00">
        HULL: 98%
      </Text>
      <Text position={[0, 0, 0]} fontSize={0.25} color="#00cc00">
        FUEL: 72%
      </Text>
      <Text position={[0, -0.5, 0]} fontSize={0.25} color="#ffcc00">
        SHIELDS: 45%
      </Text>
    </>
  )
}

// Rear camera view
function RearScene() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ elapsed }) => {
    if (ref.current) {
      ref.current.rotation.z = elapsed * 0.1
    }
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[-5, 5, 10]} intensity={0.8} />
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={90} />

      {/* Engine exhaust view */}
      <mesh ref={ref} position={[0, 0, 0]}>
        <coneGeometry args={[1, 3, 8]} />
        <meshBasicMaterial color="#00ccff" transparent opacity={0.6} />
      </mesh>

      <Stars />
    </>
  )
}

export default function MissionControl() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      {/* Main viewport */}
      <div style={{ position: 'absolute', inset: '0 200px 150px 0' }}>
        <Canvas id="main" renderer camera={{ position: [0, 2, 8], fov: 50 }}>
          <MainScene />
        </Canvas>
      </div>

      {/* Right sidebar - Minimap */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 200,
          height: 200,
          border: '2px solid #00ff00',
        }}>
        <Canvas renderer={{ primaryCanvas: 'main', scheduler: { fps: 30 } }}>
          <MinimapScene />
        </Canvas>
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            color: '#00ff00',
            fontSize: 10,
            fontFamily: 'monospace',
          }}>
          RADAR (30fps)
        </div>
      </div>

      {/* Right sidebar - Stats */}
      <div
        style={{
          position: 'absolute',
          top: 202,
          right: 0,
          width: 200,
          height: 150,
          border: '2px solid #00ff00',
        }}>
        <Canvas renderer={{ primaryCanvas: 'main', scheduler: { fps: 30 } }}>
          <StatsScene />
        </Canvas>
      </div>

      {/* Bottom - Rear view */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 200,
          height: 150,
          border: '2px solid #00ff00',
        }}>
        <Canvas renderer={{ primaryCanvas: 'main', scheduler: { fps: 15 } }}>
          <RearScene />
        </Canvas>
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            color: '#00ff00',
            fontSize: 10,
            fontFamily: 'monospace',
          }}>
          REAR CAM (15fps)
        </div>
      </div>

      {/* Bottom right corner - status */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 200,
          height: 150,
          background: '#000',
          border: '2px solid #00ff00',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00ff00',
          fontFamily: 'monospace',
          fontSize: 12,
        }}>
        <div style={{ textAlign: 'center' }}>
          <div>MISSION TIME</div>
          <div style={{ fontSize: 24 }}>04:32:17</div>
        </div>
      </div>
    </div>
  )
}
