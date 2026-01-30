/**
 * Demo: Headlights Drive
 * Features: Portal, Camera Parenting
 *
 * Simple driving scene at night with headlights attached to camera.
 * Demonstrates camera-parented lighting.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { PointerLockControls, Text, useKeyboardControls, KeyboardControls } from '@react-three/drei'
import { useRef, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'

function CameraHeadlights() {
  const { camera } = useThree()
  const leftLight = useRef<THREE.SpotLight>(null)
  const rightLight = useRef<THREE.SpotLight>(null)
  const leftTarget = useRef<THREE.Object3D>(null)
  const rightTarget = useRef<THREE.Object3D>(null)

  useFrame(() => {
    // Position lights relative to camera
    if (leftLight.current && rightLight.current && leftTarget.current && rightTarget.current) {
      // Left headlight
      leftLight.current.position.copy(camera.position)
      leftLight.current.position.x -= 0.5

      // Right headlight
      rightLight.current.position.copy(camera.position)
      rightLight.current.position.x += 0.5

      // Point targets forward from camera
      const forward = new THREE.Vector3(0, 0, -20)
      forward.applyQuaternion(camera.quaternion)

      leftTarget.current.position.copy(camera.position).add(forward)
      leftTarget.current.position.x -= 2
      rightTarget.current.position.copy(camera.position).add(forward)
      rightTarget.current.position.x += 2
    }
  })

  return (
    <>
      <object3D ref={leftTarget} />
      <object3D ref={rightTarget} />
      <spotLight
        ref={leftLight}
        target={leftTarget.current || undefined}
        intensity={100}
        angle={0.4}
        penumbra={0.3}
        distance={50}
        color="#ffffee"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <spotLight
        ref={rightLight}
        target={rightTarget.current || undefined}
        intensity={100}
        angle={0.4}
        penumbra={0.3}
        distance={50}
        color="#ffffee"
        castShadow
      />
    </>
  )
}

function Road() {
  const segments = 20
  const segmentLength = 10

  return (
    <group>
      {/* Road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (-segments * segmentLength) / 2]} receiveShadow>
        <planeGeometry args={[8, segments * segmentLength]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Road markings */}
      {Array.from({ length: segments * 2 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -i * 5 - 2.5]}>
          <planeGeometry args={[0.2, 3]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      ))}

      {/* Road edges */}
      {[-4.2, 4.2].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, (-segments * segmentLength) / 2]}>
          <planeGeometry args={[0.1, segments * segmentLength]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  )
}

function Trees() {
  const trees = useMemo(() => {
    const result: Array<{ position: [number, number, number]; scale: number }> = []
    for (let z = 0; z > -200; z -= 8) {
      // Left side
      result.push({
        position: [-8 - Math.random() * 5, 0, z + Math.random() * 4],
        scale: 0.8 + Math.random() * 0.4,
      })
      // Right side
      result.push({
        position: [8 + Math.random() * 5, 0, z + Math.random() * 4],
        scale: 0.8 + Math.random() * 0.4,
      })
    }
    return result
  }, [])

  return (
    <>
      {trees.map((tree, i) => (
        <group key={i} position={tree.position} scale={tree.scale}>
          {/* Trunk */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.3, 3, 8]} />
            <meshStandardMaterial color="#4a3728" />
          </mesh>
          {/* Foliage */}
          <mesh position={[0, 4, 0]} castShadow>
            <coneGeometry args={[1.5, 4, 8]} />
            <meshStandardMaterial color="#1a3a1a" />
          </mesh>
        </group>
      ))}
    </>
  )
}

function MovementController() {
  const { camera } = useThree()
  const velocity = useRef(new THREE.Vector3())
  const [isMoving, setIsMoving] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        setIsMoving(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        setIsMoving(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame(({ delta }) => {
    if (isMoving) {
      // Move forward
      const direction = new THREE.Vector3(0, 0, -1)
      direction.applyQuaternion(camera.quaternion)
      direction.y = 0 // Keep on ground
      direction.normalize()

      camera.position.add(direction.multiplyScalar(delta * 15))

      // Keep camera at driving height
      camera.position.y = 1.5
    }
  })

  return null
}

function HUD() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        textAlign: 'center',
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}>
      <div style={{ fontSize: 14, opacity: 0.8 }}>Click to enable mouse look</div>
      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>W / ↑ to drive forward</div>
    </div>
  )
}

function Scene() {
  return (
    <>
      {/* Minimal ambient for night scene */}
      <ambientLight intensity={0.02} />

      {/* Moon */}
      <directionalLight position={[50, 100, 50]} intensity={0.1} color="#aaccff" />

      <CameraHeadlights />
      <Road />
      <Trees />
      <MovementController />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -100]} receiveShadow>
        <planeGeometry args={[200, 300]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Sky */}
      <mesh>
        <sphereGeometry args={[500, 32, 32]} />
        <meshBasicMaterial color="#050510" side={THREE.BackSide} />
      </mesh>

      <PointerLockControls />
    </>
  )
}

export default function HeadlightsDrive() {
  return (
    <>
      <Canvas renderer camera={{ position: [0, 1.5, 5], fov: 70 }} shadows>
        <Scene />
      </Canvas>
      <HUD />
    </>
  )
}
