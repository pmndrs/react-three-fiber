/**
 * Demo: Split Screen Racing
 * Features: Multi-Canvas, Scheduler
 *
 * Two players, split screen, shared scene, independent cameras.
 * Classic gaming pattern with modern R3F.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { PerspectiveCamera, Text, OrbitControls } from '@react-three/drei'
import { useRef, useState, useEffect, useMemo } from 'react'
import * as THREE from 'three'

function RaceCar({
  color,
  position,
  controls,
}: {
  color: string
  position: [number, number, number]
  controls: { left: boolean; right: boolean; forward: boolean; back: boolean }
}) {
  const carRef = useRef<THREE.Group>(null)
  const velocity = useRef(0)
  const rotation = useRef(0)

  useFrame(({ delta }) => {
    if (!carRef.current) return

    // Steering
    if (controls.left) rotation.current += delta * 2
    if (controls.right) rotation.current -= delta * 2

    // Acceleration/braking
    if (controls.forward) velocity.current = Math.min(velocity.current + delta * 5, 10)
    else if (controls.back) velocity.current = Math.max(velocity.current - delta * 8, -3)
    else velocity.current *= 0.98 // Natural deceleration

    // Apply movement
    carRef.current.rotation.y = rotation.current
    carRef.current.position.x += Math.sin(rotation.current) * velocity.current * delta
    carRef.current.position.z += Math.cos(rotation.current) * velocity.current * delta

    // Keep on track (simple bounds)
    carRef.current.position.x = THREE.MathUtils.clamp(carRef.current.position.x, -15, 15)
    carRef.current.position.z = THREE.MathUtils.clamp(carRef.current.position.z, -50, 50)
  })

  return (
    <group ref={carRef} position={position}>
      {/* Car body */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1, 0.4, 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.6, -0.2]} castShadow>
        <boxGeometry args={[0.8, 0.3, 1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Wheels */}
      {[
        [-0.5, 0.15, 0.7],
        [0.5, 0.15, 0.7],
        [-0.5, 0.15, -0.7],
        [0.5, 0.15, -0.7],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
    </group>
  )
}

function RaceTrack() {
  return (
    <>
      {/* Track surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 120]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>

      {/* Track edges */}
      {[-18, 18].map((x) => (
        <mesh key={x} position={[x, 0.1, 0]}>
          <boxGeometry args={[0.5, 0.2, 120]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
      ))}

      {/* Start/finish line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 40]}>
        <planeGeometry args={[35, 2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Lane divider */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, i * 6 - 57]}>
          <planeGeometry args={[0.3, 3]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      ))}
    </>
  )
}

function FollowCamera({ carRef, offset }: { carRef: React.RefObject<THREE.Group>; offset: [number, number, number] }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  useFrame(() => {
    if (!cameraRef.current || !carRef.current) return

    // Position camera behind and above car
    const carPos = carRef.current.position
    const carRot = carRef.current.rotation.y

    const cameraOffset = new THREE.Vector3(Math.sin(carRot) * offset[2], offset[1], Math.cos(carRot) * offset[2])

    cameraRef.current.position.lerp(carPos.clone().add(cameraOffset), 0.1)
    cameraRef.current.lookAt(carPos)
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={60} />
}

interface PlayerSceneProps {
  playerNum: 1 | 2
  carColor: string
  startPosition: [number, number, number]
  controls: { left: boolean; right: boolean; forward: boolean; back: boolean }
}

function PlayerScene({ playerNum, carColor, startPosition, controls }: PlayerSceneProps) {
  const carRef = useRef<THREE.Group>(null)

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />

      <RaceTrack />

      <group ref={carRef}>
        <RaceCar color={carColor} position={startPosition} controls={controls} />
      </group>

      {/* Other player's car (static representation) */}
      <mesh position={playerNum === 1 ? [5, 0.3, 40] : [-5, 0.3, 40]}>
        <boxGeometry args={[1, 0.5, 2]} />
        <meshStandardMaterial color={playerNum === 1 ? '#3498db' : '#e74c3c'} />
      </mesh>

      <FollowCamera carRef={carRef} offset={[0, 4, 8]} />
    </>
  )
}

function useControls(keys: { left: string; right: string; forward: string; back: string }) {
  const [state, setState] = useState({ left: false, right: false, forward: false, back: false })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === keys.left) setState((s) => ({ ...s, left: true }))
      if (e.code === keys.right) setState((s) => ({ ...s, right: true }))
      if (e.code === keys.forward) setState((s) => ({ ...s, forward: true }))
      if (e.code === keys.back) setState((s) => ({ ...s, back: true }))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === keys.left) setState((s) => ({ ...s, left: false }))
      if (e.code === keys.right) setState((s) => ({ ...s, right: false }))
      if (e.code === keys.forward) setState((s) => ({ ...s, forward: false }))
      if (e.code === keys.back) setState((s) => ({ ...s, back: false }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [keys])

  return state
}

function PlayerLabel({ player, color }: { player: number; color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: player === 1 ? 10 : 'auto',
        right: player === 2 ? 10 : 'auto',
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        textShadow: '0 0 4px black',
        padding: '4px 12px',
        background: color,
        borderRadius: 4,
      }}>
      Player {player}
    </div>
  )
}

function Controls() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        fontSize: 11,
        textAlign: 'center',
        background: 'rgba(0,0,0,0.7)',
        padding: '8px 16px',
        borderRadius: 4,
      }}>
      <div>
        <strong>Player 1:</strong> WASD | <strong>Player 2:</strong> Arrow Keys
      </div>
    </div>
  )
}

export default function SplitScreen() {
  const p1Controls = useControls({
    left: 'KeyA',
    right: 'KeyD',
    forward: 'KeyW',
    back: 'KeyS',
  })

  const p2Controls = useControls({
    left: 'ArrowLeft',
    right: 'ArrowRight',
    forward: 'ArrowUp',
    back: 'ArrowDown',
  })

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#000' }}>
      {/* Player 1 viewport */}
      <div style={{ flex: 1, position: 'relative', borderRight: '2px solid #333' }}>
        <Canvas id="player1" renderer shadows>
          <PlayerScene playerNum={1} carColor="#e74c3c" startPosition={[-5, 0, 40]} controls={p1Controls} />
        </Canvas>
        <PlayerLabel player={1} color="#e74c3c" />
      </div>

      {/* Player 2 viewport */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas renderer={{ primaryCanvas: 'player1' }} shadows>
          <PlayerScene playerNum={2} carColor="#3498db" startPosition={[5, 0, 40]} controls={p2Controls} />
        </Canvas>
        <PlayerLabel player={2} color="#3498db" />
      </div>

      <Controls />
    </div>
  )
}
