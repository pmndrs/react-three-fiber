/**
 * Demo: Piano Keys
 * Features: Per-Pointer State, Multi-Touch Events
 *
 * Interactive piano with proper multi-touch support.
 * Multiple fingers can play multiple keys simultaneously.
 */

import { Canvas, ThreeEvent } from '@react-three/fiber/webgpu'
import { OrbitControls, Text } from '@react-three/drei'
import { useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

const NOTE_FREQUENCIES: Record<string, number> = {
  C4: 261.63,
  'C#4': 277.18,
  D4: 293.66,
  'D#4': 311.13,
  E4: 329.63,
  F4: 349.23,
  'F#4': 369.99,
  G4: 392.0,
  'G#4': 415.3,
  A4: 440.0,
  'A#4': 466.16,
  B4: 493.88,
  C5: 523.25,
}

// Simple audio context for playing notes
let audioContext: AudioContext | null = null

function playNote(frequency: number) {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5)

  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.5)
}

interface KeyProps {
  note: string
  position: [number, number, number]
  isBlack?: boolean
}

function PianoKey({ note, position, isBlack = false }: KeyProps) {
  const [pressedPointers, setPressedPointers] = useState<Set<number>>(new Set())
  const meshRef = useRef<THREE.Mesh>(null)

  const isPressed = pressedPointers.size > 0

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      const pointerId = e.pointerId

      setPressedPointers((prev) => {
        if (!prev.has(pointerId)) {
          playNote(NOTE_FREQUENCIES[note])
          return new Set([...prev, pointerId])
        }
        return prev
      })
    },
    [note],
  )

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setPressedPointers((prev) => {
      const next = new Set(prev)
      next.delete(e.pointerId)
      return next
    })
  }, [])

  const handlePointerLeave = useCallback((e: ThreeEvent<PointerEvent>) => {
    setPressedPointers((prev) => {
      const next = new Set(prev)
      next.delete(e.pointerId)
      return next
    })
  }, [])

  const keyWidth = isBlack ? 0.3 : 0.45
  const keyHeight = isBlack ? 0.6 : 1
  const keyDepth = isBlack ? 0.1 : 0.15
  const pressOffset = isPressed ? -0.02 : 0

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        position={[0, pressOffset, isBlack ? 0.2 : 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}>
        <boxGeometry args={[keyWidth, keyDepth, keyHeight]} />
        <meshStandardMaterial
          color={isBlack ? (isPressed ? '#333' : '#111') : isPressed ? '#ddd' : '#fff'}
          roughness={0.3}
        />
      </mesh>
      {!isBlack && (
        <Text position={[0, 0.08, -0.35]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.08} color="#999">
          {note.replace('4', '').replace('5', '')}
        </Text>
      )}
    </group>
  )
}

function Piano() {
  const whiteKeys = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
  const blackKeys = [
    { note: 'C#4', offset: 0 },
    { note: 'D#4', offset: 1 },
    { note: 'F#4', offset: 3 },
    { note: 'G#4', offset: 4 },
    { note: 'A#4', offset: 5 },
  ]

  return (
    <group position={[0, 0, 0]}>
      {/* Piano body */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[4.5, 0.3, 1.5]} />
        <meshStandardMaterial color="#2a1810" roughness={0.8} />
      </mesh>

      {/* White keys */}
      {whiteKeys.map((note, i) => (
        <PianoKey key={note} note={note} position={[(i - 3.5) * 0.5, 0, 0]} />
      ))}

      {/* Black keys */}
      {blackKeys.map(({ note, offset }) => (
        <PianoKey key={note} note={note} position={[(offset - 3) * 0.5 + 0.25, 0.1, 0]} isBlack />
      ))}
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-3, 3, 3]} intensity={0.3} color="#ffd700" />

      <Piano />

      {/* Instructions */}
      <Text position={[0, 1.5, 0]} fontSize={0.2} color="#ffffff">
        Click/Touch keys to play
      </Text>
      <Text position={[0, 1.2, 0]} fontSize={0.12} color="#888888">
        Multi-touch supported on touch devices
      </Text>

      {/* Background */}
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        minDistance={3}
        maxDistance={8}
      />
    </>
  )
}

export default function PianoKeys() {
  return (
    <Canvas renderer camera={{ position: [0, 3, 4], fov: 50 }} shadows>
      <Scene />
    </Canvas>
  )
}
