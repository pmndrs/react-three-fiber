/**
 * useFrameNext Controls Demo
 *
 * Demonstrates the controls API returned by useFrameNext:
 * - pause() - Pause this job
 * - resume() - Resume this job
 * - step() - Step this job once (bypasses FPS limits)
 * - stepAll() - Step all jobs
 * - isPaused - Check if job is paused
 *
 * Interactive buttons let you control the animation in real-time.
 */

import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrameNext } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { color, mix, sin, time } from 'three/tsl'
import * as THREE from 'three'

//* Controlled Sphere ==============================

function ControlledSphere() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [, forceUpdate] = useState(0)

  // TSL color that shifts over time
  const colorNode = useMemo(() => {
    const blue = color('royalblue')
    const purple = color('mediumpurple')
    const t = sin(time.mul(1.5)).mul(0.5).add(0.5)
    return mix(blue, purple, t)
  }, [])

  // useFrameNext returns controls object
  // Note: Inline options work without memoization - the hook handles value comparison
  const controls = useFrameNext(
    (state, delta) => {
      meshRef.current.rotation.x += delta * 0.8
      meshRef.current.rotation.y += delta * 1.2
      meshRef.current.rotation.z += delta * 0.3
    },
    { id: 'spinning-sphere', fps: 30 },
  )

  // Button handlers
  const handlePause = () => {
    controls.pause()
    forceUpdate((n) => n + 1) // Re-render to update isPaused display
  }

  const handleResume = () => {
    controls.resume()
    forceUpdate((n) => n + 1)
  }

  const handleStep = () => {
    controls.step()
    forceUpdate((n) => n + 1)
  }

  const handleStepAll = () => {
    controls.stepAll()
    forceUpdate((n) => n + 1)
  }

  return (
    <group>
      {/* Spinning sphere */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshStandardNodeMaterial colorNode={colorNode} roughness={0.2} metalness={0.6} flatShading />
      </mesh>

      {/* Control panel */}
      <Html position={[0, -3, 0]} center>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '12px',
            fontFamily: 'system-ui, sans-serif',
            color: 'white',
            minWidth: '280px',
            position: 'absolute',
            top: '-100vh',
          }}>
          {/* Status indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '18px',
              fontWeight: 'bold',
            }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: controls.isPaused ? '#ef4444' : '#22c55e',
                boxShadow: controls.isPaused ? '0 0 8px #ef4444' : '0 0 8px #22c55e',
              }}
            />
            {controls.isPaused ? 'PAUSED' : 'RUNNING'}
          </div>

          {/* Control buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <ControlButton onClick={handlePause} disabled={controls.isPaused}>
              ⏸️ Pause
            </ControlButton>
            <ControlButton onClick={handleResume} disabled={!controls.isPaused}>
              ▶️ Resume
            </ControlButton>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <ControlButton onClick={handleStep}>⏭️ Step One</ControlButton>
            <ControlButton onClick={handleStepAll}>⏩ Step All</ControlButton>
          </div>

          {/* Job info */}
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Job ID: <code style={{ color: '#60a5fa' }}>{controls.id}</code>
          </div>
        </div>
      </Html>
    </group>
  )
}

//* Control Button Component ==============================

interface ControlButtonProps {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

function ControlButton({ onClick, disabled, children }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: '500',
        border: 'none',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? '#374151' : '#3b82f6',
        color: disabled ? '#6b7280' : 'white',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}>
      {children}
    </button>
  )
}

//* Scene ==============================

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 3, -5]} intensity={0.5} color="hotpink" />

      <ControlledSphere />
    </>
  )
}

//* Main Export ==============================

export default function UseFrameNextControls() {
  return (
    <Canvas renderer camera={{ position: [0, 0, 6], fov: 50 }}>
      <Scene />
    </Canvas>
  )
}
