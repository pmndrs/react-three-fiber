/**
 * Demo: Flashlight Maze
 * Features: Portal, Camera Parenting, onOccluded
 *
 * First-person horror maze where the only light is camera-attached flashlight.
 * Uses onOccluded to spawn things when you're not looking.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { PointerLockControls, useKeyboardControls, KeyboardControls } from '@react-three/drei'
import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'

function Flashlight() {
  const { camera } = useThree()
  const lightRef = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)

  useFrame(() => {
    if (lightRef.current && targetRef.current) {
      // Position light at camera
      lightRef.current.position.copy(camera.position)

      // Point target in front of camera
      const direction = new THREE.Vector3(0, 0, -10)
      direction.applyQuaternion(camera.quaternion)
      targetRef.current.position.copy(camera.position).add(direction)
    }
  })

  return (
    <>
      <object3D ref={targetRef} />
      <spotLight
        ref={lightRef}
        target={targetRef.current || undefined}
        intensity={50}
        angle={0.4}
        penumbra={0.5}
        distance={30}
        color="#ffffcc"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </>
  )
}

function MazeWall({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[4, 3, 0.3]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
    </mesh>
  )
}

function CreepyThing({ position }: { position: [number, number, number] }) {
  const [visible, setVisible] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ camera }) => {
    if (meshRef.current) {
      // Face the camera
      meshRef.current.lookAt(camera.position)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onOccluded={(occluded) => {
        // Appear when player looks away
        if (occluded && !visible) {
          setTimeout(() => setVisible(true), 500)
        }
      }}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshStandardMaterial
        color={visible ? '#ff0000' : '#000000'}
        emissive={visible ? '#330000' : '#000000'}
        transparent
        opacity={visible ? 1 : 0}
      />
    </mesh>
  )
}
type pos = [number, number, number]
type rot = [number, number, number]
type wall = { pos: pos; rot: rot }

function Maze() {
  const walls = useMemo<wall[]>(
    () => [
      // Outer walls
      { pos: [0, 1.5, -10], rot: [0, 0, 0] },
      { pos: [4, 1.5, -10], rot: [0, 0, 0] },
      { pos: [-4, 1.5, -10], rot: [0, 0, 0] },
      { pos: [10, 1.5, -6], rot: [0, Math.PI / 2, 0] },
      { pos: [-10, 1.5, -6], rot: [0, Math.PI / 2, 0] },
      // Inner walls
      { pos: [3, 1.5, -5], rot: [0, Math.PI / 2, 0] },
      { pos: [-3, 1.5, -3], rot: [0, 0, 0] },
      { pos: [0, 1.5, 2], rot: [0, Math.PI / 4, 0] },
    ],
    [],
  )

  return (
    <>
      {walls.map((wall, i) => (
        <MazeWall key={i} position={wall.pos} rotation={wall.rot} />
      ))}

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#050505" />
      </mesh>

      {/* Creepy things that appear when you look away */}
      <CreepyThing position={[5, 1, -8]} />
      <CreepyThing position={[-6, 1.5, -4]} />
      <CreepyThing position={[0, 1, -6]} />
    </>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.01} />
      <Flashlight />
      <Maze />
      <PointerLockControls />
    </>
  )
}

export default function FlashlightMaze() {
  return (
    <Canvas renderer camera={{ position: [0, 1.6, 5], fov: 70 }} shadows>
      <Scene />
    </Canvas>
  )
}
