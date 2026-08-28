/** Shows why a follow camera must run after visual interpolation. */

import { useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PHYSICS_FPS = 15
const FIXED_STEP = 1 / PHYSICS_FPS
const ORBIT_RADIUS = 4.5
const ORBIT_SPEED = 2.4
const CAMERA_DISTANCE = 3.8
const CAMERA_HEIGHT = 2.2

function getAngle(time: number) {
  return time * ORBIT_SPEED
}

function setTargetTransform(target: THREE.Group, angle: number) {
  target.position.set(Math.cos(angle) * ORBIT_RADIUS, 0.35, Math.sin(angle) * ORBIT_RADIUS)
  target.rotation.y = -angle
}

function PhaseDemo({ swapped }: { swapped: boolean }) {
  const target = useRef<THREE.Group>(null!)
  const physics = useRef({ previous: 0, current: 0, time: 0 })
  const interpolationPhase = swapped ? 'camera' : 'update'
  const cameraPhase = swapped ? 'update' : 'camera'
  const { scheduler } = useFrame()

  useLayoutEffect(() => {
    if (!scheduler.hasPhase('camera')) scheduler.addPhase('camera', { after: 'update', before: 'render' })
  }, [scheduler])

  // Physics publishes a raw transform at 15 Hz.
  useFrame(
    ({ elapsed }) => {
      const state = physics.current
      state.previous = state.current
      state.current = getAngle(elapsed)
      state.time = elapsed

      setTargetTransform(target.current, state.current)
    },
    { id: 'phase-demo-physics', phase: 'physics', fps: PHYSICS_FPS },
  )

  // Interpolation replaces the stepped transform with the smooth render transform.
  useFrame(
    ({ elapsed }) => {
      const state = physics.current
      const alpha = THREE.MathUtils.clamp((elapsed - state.time) / FIXED_STEP, 0, 1)
      const angle = THREE.MathUtils.lerp(state.previous, state.current, alpha)

      setTargetTransform(target.current, angle)
    },
    { id: 'phase-demo-interpolation', phase: interpolationPhase },
  )

  // When this runs early it reads raw physics; after interpolation it reads smooth motion.
  useFrame(
    ({ camera }) => {
      const { x, z } = target.current.position
      const angle = -target.current.rotation.y

      camera.position.set(x + Math.sin(angle) * CAMERA_DISTANCE, CAMERA_HEIGHT, z - Math.cos(angle) * CAMERA_DISTANCE)
      camera.lookAt(x, 0.35, z)
    },
    { id: 'phase-demo-camera', phase: cameraPhase },
  )

  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.05, 4.95, 128]} />
        <meshStandardMaterial color="#c4b5fd" roughness={0.95} />
      </mesh>

      <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.47, 4.53, 128]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2
        const radius = index % 2 ? 5.45 : 3.55

        return (
          <mesh key={index} position={[Math.cos(angle) * radius, 0.18, Math.sin(angle) * radius]}>
            <boxGeometry args={[0.09, 0.36, 0.09]} />
            <meshBasicMaterial color={index % 2 ? 'lightblue' : 'lightpink'} toneMapped={false} />
          </mesh>
        )
      })}

      <group ref={target} position={[ORBIT_RADIUS, 0.35, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.58, 0.34, 0.9]} />
          <meshStandardMaterial color="hotpink" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 0.42, 3]} />
          <meshStandardMaterial color="peachpuff" />
        </mesh>
      </group>

      <mesh receiveShadow position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#f3f0f7" roughness={1} />
      </mesh>
    </>
  )
}

export default function useFramePhases() {
  const [swapped, setSwapped] = useState(false)
  const statusColor = swapped ? '#d95b73' : '#3b9b8b'
  const phases = [
    { name: 'PHYSICS', job: `${PHYSICS_FPS} HZ`, color: '#f8c45c' },
    { name: 'UPDATE', job: swapped ? 'FOLLOW' : 'INTERPOLATE', color: '#8bd3e6' },
    { name: 'CAMERA', job: swapped ? 'INTERPOLATE' : 'FOLLOW', color: '#c3a6e8' },
    { name: 'RENDER', job: 'DRAW', color: '#ffffff' },
  ]

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas renderer shadows camera={{ position: [ORBIT_RADIUS, CAMERA_HEIGHT, -CAMERA_DISTANCE], fov: 50 }}>
        <color attach="background" args={['#f3f0f7']} />
        <fog attach="fog" args={['#f3f0f7', 8, 18]} />
        <ambientLight intensity={Math.PI * 0.65} />
        <directionalLight castShadow position={[4, 8, 2]} intensity={Math.PI} />
        <PhaseDemo swapped={swapped} />
      </Canvas>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 22,
          height: 22,
          border: `1px solid ${statusColor}99`,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          fontFamily: 'Inter var, system-ui, sans-serif',
        }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, overflowX: 'auto' }}>
          {phases.map((phase, index) => (
            <div key={phase.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ width: 76, textAlign: 'center' }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    margin: '8px auto',
                    border: 0,
                    borderRadius: '50%',
                    background: phase.color,
                  }}
                />
                <div style={{ color: '#575260', fontSize: 10, fontWeight: 750, letterSpacing: '0.06em' }}>
                  {phase.name}
                </div>
                <div style={{ color: '#8b8492', fontSize: 8, letterSpacing: '0.05em' }}>{phase.job}</div>
              </div>
              {index < phases.length - 1 && (
                <span style={{ marginTop: 8, color: swapped ? '#d95b73' : '#918b9d' }}>→</span>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          title={swapped ? 'Restore phase order' : 'Swap update and camera phases'}
          aria-label={swapped ? 'Restore phase order' : 'Swap update and camera phases'}
          aria-pressed={swapped}
          onClick={() => setSwapped((value) => !value)}
          style={{
            display: 'block',
            width: 76,
            marginTop: 8,
            padding: 0,
            border: 0,
            color: statusColor,
            background: 'transparent',
            fontSize: 17,
            textAlign: 'center',
            cursor: 'pointer',
          }}>
          🔀
        </button>
      </div>
    </div>
  )
}
