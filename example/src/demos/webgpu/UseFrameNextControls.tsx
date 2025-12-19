/**
 * useFrame Controls Demo
 *
 * Demonstrates the controls API returned by useFrame:
 * - pause() / resume() - Pause/resume individual jobs
 * - step() / stepAll() - Manual stepping
 * - isPaused - Reactive pause state
 * - scheduler.stop() / scheduler.start() - Control the entire loop
 *
 * Shows both individual job control AND scheduler-level control.
 */

import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { color, mix, sin, time } from 'three/tsl'
import * as THREE from 'three'
import { CameraControls, Html } from '@react-three/drei'

//* Orbiting Ball + Light ==============================
// Uses plain useFrame with no config - just like normal animation

function OrbitingElements() {
  const ballRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const angleRef = useRef(0)

  // Plain useFrame - no options, just callback
  // This is how most animations would be written
  useFrame((state, delta) => {
    angleRef.current += delta * 0.003
    const radius = 3

    // Orbit the ball
    ballRef.current.position.x = Math.cos(angleRef.current) * radius
    ballRef.current.position.z = Math.sin(angleRef.current) * radius
    ballRef.current.position.y = Math.sin(angleRef.current * 2) * 0.5

    // Light orbits opposite direction, slightly offset
    lightRef.current.position.x = Math.cos(-angleRef.current * 0.7) * radius * 1.2
    lightRef.current.position.z = Math.sin(-angleRef.current * 0.7) * radius * 1.2
    lightRef.current.position.y = Math.cos(angleRef.current) * 1.5 + 1
  })

  return (
    <>
      {/* Orbiting ball */}
      <mesh ref={ballRef} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardNodeMaterial color="coral" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Orbiting point light */}
      <pointLight ref={lightRef} intensity={15} color="hotpink" distance={8} />
    </>
  )
}

//* Control Button Component ==============================

interface ControlButtonProps {
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'danger' | 'success'
  children: React.ReactNode
}

function ControlButton({ onClick, disabled, variant = 'primary', children }: ControlButtonProps) {
  const colors = {
    primary: { bg: '#3b82f6', hover: '#2563eb' },
    danger: { bg: '#ef4444', hover: '#dc2626' },
    success: { bg: '#22c55e', hover: '#16a34a' },
  }

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
        background: disabled ? '#374151' : colors[variant].bg,
        color: disabled ? '#6b7280' : 'white',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}>
      {children}
    </button>
  )
}

//* Control Panel UI (outside Canvas) ==============================

interface ControlPanelProps {
  sphereControls: {
    pause: () => void
    resume: () => void
    step: () => void
    stepAll: () => void
    isPaused: boolean
    scheduler: any
    id: string
  } | null
  schedulerRunning: boolean
  onSchedulerToggle: () => void
}

function ControlPanel({ sphereControls, schedulerRunning, onSchedulerToggle }: ControlPanelProps) {
  if (!sphereControls) return null

  const { pause, resume, step, stepAll, isPaused, scheduler, id } = sphereControls

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '16px',
        fontFamily: 'system-ui, sans-serif',
        color: 'white',
        minWidth: '360px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
      {/* Title */}
      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#94a3b8' }}>useFrame Controls</div>

      {/* Two-column layout for job vs scheduler */}
      <div style={{ display: 'flex', gap: '24px', width: '100%' }}>
        {/* Individual Job Control */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px',
          }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Sphere Job
          </div>

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 'bold' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: isPaused ? '#ef4444' : '#22c55e',
                boxShadow: isPaused ? '0 0 8px #ef4444' : '0 0 8px #22c55e',
              }}
            />
            {isPaused ? 'PAUSED' : 'RUNNING'}
          </div>

          {/* Job controls */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <ControlButton onClick={pause} disabled={isPaused}>
              ⏸️
            </ControlButton>
            <ControlButton onClick={resume} disabled={!isPaused}>
              ▶️
            </ControlButton>
            <ControlButton onClick={() => step()}>⏭️</ControlButton>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b' }}>
            ID: <code style={{ color: '#60a5fa' }}>{id}</code>
          </div>
        </div>

        {/* Scheduler Control */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px',
          }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Scheduler
          </div>

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 'bold' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: schedulerRunning ? '#22c55e' : '#ef4444',
                boxShadow: schedulerRunning ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
              }}
            />
            {schedulerRunning ? 'RUNNING' : 'STOPPED'}
          </div>

          {/* Scheduler controls */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <ControlButton onClick={onSchedulerToggle} variant={schedulerRunning ? 'danger' : 'success'}>
              {schedulerRunning ? '⏹️ Stop All' : '▶️ Start All'}
            </ControlButton>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Jobs: <code style={{ color: '#60a5fa' }}>{scheduler?.getJobCount() ?? 0}</code>
          </div>
        </div>
      </div>

      {/* Step All button - affects all jobs */}
      <ControlButton onClick={() => stepAll()}>⏩ Step All Jobs</ControlButton>

      {/* Info text */}
      <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center', maxWidth: '320px' }}>
        <strong>Sphere Job:</strong> Controls only the center sphere (fps: 30)
        <br />
        <strong>Scheduler:</strong> Controls the entire loop (affects orbiting ball + light too)
      </div>
    </div>
  )
}

//* Moving Spotlight ==============================

function MovingSpotlight() {
  const { scene } = useThree()
  const lightRef = useRef<THREE.SpotLight>(null!)
  const helperRef = useRef<THREE.SpotLightHelper>(null!)

  useFrame(
    ({ elapsed }, delta) => {
      const light = lightRef.current
      const maxX = 5
      const speed = 0.001 // Speed multiplier

      // Ping-pong using sin wave
      light.position.x = Math.sin(elapsed * speed) * maxX

      // Point the light downward at the center (always at 0,0,0)
      light.target.position.set(0, 0, 0)
      light.target.updateMatrixWorld()

      helperRef.current?.update()
    },
    { id: 'moving-spotlight' },
  )

  // with vanilla add a helper
  useEffect(() => {
    if (!lightRef.current) return
    helperRef.current = new THREE.SpotLightHelper(lightRef.current, 1)
    scene.add(helperRef.current)
    return () => {
      scene.remove(helperRef.current)
    }
  }, [scene])
  return (
    <spotLight
      castShadow
      ref={lightRef}
      position={[0, 10, 0]}
      intensity={200}
      angle={Math.PI / 12}
      penumbra={0.3}
      decay={2}
      distance={20}
    />
  )
}

// Control for the spotlight
function SpotlightControls() {
  const { scheduler } = useFrame()
  const pause = useCallback(() => {
    scheduler.pauseJob('moving-spotlight')
  }, [scheduler])
  const resume = useCallback(() => {
    scheduler.resumeJob('moving-spotlight')
  }, [scheduler])
  return (
    <group position={[0, 8, 0]}>
      <Html center>
        <div
          id="spotlight-controls"
          style={{
            position: 'absolute',
            top: '57vh',
            left: '-50vw',
            display: 'flex',
            gap: '8px',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.75)',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
          }}>
          <ControlButton onClick={pause}>⏸️ Spotlight</ControlButton>
          <ControlButton onClick={resume}>▶️ Spotlight</ControlButton>
        </div>
      </Html>
    </group>
  )
}

//* Scene ==============================

interface SceneProps {
  onControlsReady: (controls: any) => void
}

function Scene({ onControlsReady }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {/* Orbiting elements - plain useFrame, no config */}
      <OrbitingElements />
      <MovingSpotlight />
      <SpotlightControls />
      {/* Center sphere with controls */}
      <ControlledSphereWithCallback onControlsReady={onControlsReady} />
      <mesh position={[0, -0.99, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardNodeMaterial color="white" />
      </mesh>
    </>
  )
}

//* Sphere wrapper that reports controls ==============================

interface ControlledSphereWithCallbackProps {
  onControlsReady: (controls: any) => void
}

function ControlledSphereWithCallback({ onControlsReady }: ControlledSphereWithCallbackProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  // TSL color that shifts over time
  const colorNode = useMemo(() => {
    const blue = color('royalblue')
    const purple = color('mediumpurple')
    const t = sin(time.mul(1.5)).mul(0.5).add(0.5)
    return mix(blue, purple, t)
  }, [])

  // useFrame with fps limit
  const controls = useFrame(
    (state, delta) => {
      meshRef.current.rotation.x += delta * 0.2
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.rotation.z += delta * 0.075
    },
    { id: 'spinning-sphere', fps: 30 },
  )

  // Report controls to parent on mount
  useMemo(() => {
    onControlsReady(controls)
  }, [controls, onControlsReady])

  return (
    <mesh ref={meshRef} castShadow>
      <icosahedronGeometry args={[1.5, 2]} />
      <meshStandardNodeMaterial colorNode={colorNode} roughness={0.2} metalness={0.6} flatShading />
    </mesh>
  )
}

//* Main Export ==============================

export default function useFrameControls() {
  const [sphereControls, setSphereControls] = useState<any>(null)
  const [schedulerRunning, setSchedulerRunning] = useState(true)

  const handleControlsReady = useCallback((controls: any) => {
    setSphereControls(controls)
  }, [])

  const handleSchedulerToggle = useCallback(() => {
    if (!sphereControls?.scheduler) return
    const scheduler = sphereControls.scheduler
    if (scheduler.isRunning) {
      scheduler.stop()
      setSchedulerRunning(false)
    } else {
      scheduler.start()
      setSchedulerRunning(true)
    }
  }, [sphereControls])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas renderer camera={{ position: [0, 0, 8], fov: 50 }}>
        <Scene onControlsReady={handleControlsReady} />
        <CameraControls />
      </Canvas>

      {/* UI outside Canvas to avoid WebGPU HTML flipping issues */}
      <ControlPanel
        sphereControls={sphereControls}
        schedulerRunning={schedulerRunning}
        onSchedulerToggle={handleSchedulerToggle}
      />
    </div>
  )
}
