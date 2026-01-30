/**
 * Demo: Security Cameras
 * Features: useRenderTarget, Multi-Viewport
 *
 * Room with 4 security monitors showing live feeds from different camera angles.
 * Demonstrates render-to-texture with multiple viewpoints.
 */

import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber/webgpu'
import { OrbitControls, PerspectiveCamera, useFBO, Text } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

function MovingCube() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ elapsed }) => {
    if (ref.current) {
      ref.current.position.x = Math.sin(elapsed) * 2
      ref.current.position.z = Math.cos(elapsed) * 2
      ref.current.rotation.y = elapsed
    }
  })

  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="#e74c3c" />
    </mesh>
  )
}

function MovingSphere() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ elapsed }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(elapsed * 1.5) * 0.5 + 1
      ref.current.position.x = Math.cos(elapsed * 0.7) * 1.5
    }
  })

  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial color="#3498db" />
    </mesh>
  )
}

function WatchedScene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />

      <MovingCube />
      <MovingSphere />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>

      {/* Pillars for reference */}
      {[
        [-3, 0, -3],
        [3, 0, -3],
        [-3, 0, 3],
        [3, 0, 3],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 3]} />
          <meshStandardMaterial color="#7f8c8d" />
        </mesh>
      ))}
    </>
  )
}

interface SecurityCameraProps {
  position: [number, number, number]
  lookAt: [number, number, number]
  label: string
}

function Monitor({
  position,
  rotation,
  texture,
  label,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  texture: THREE.Texture
  label: string
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Monitor frame */}
      <mesh>
        <boxGeometry args={[1.4, 1.1, 0.1]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Screen */}
      <mesh position={[0, 0, 0.051]}>
        <planeGeometry args={[1.2, 0.9]} />
        <meshBasicMaterial map={texture} />
      </mesh>

      {/* Label */}
      <Text position={[0, 0.65, 0.06]} fontSize={0.08} color="#00ff00">
        {label}
      </Text>

      {/* Recording indicator */}
      <mesh position={[0.5, 0.65, 0.06]}>
        <circleGeometry args={[0.03, 16]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
    </group>
  )
}

function ControlRoom() {
  const cam1Ref = useRef<THREE.PerspectiveCamera>(null)
  const cam2Ref = useRef<THREE.PerspectiveCamera>(null)
  const cam3Ref = useRef<THREE.PerspectiveCamera>(null)
  const cam4Ref = useRef<THREE.PerspectiveCamera>(null)

  const fbo1 = useFBO(512, 384)
  const fbo2 = useFBO(512, 384)
  const fbo3 = useFBO(512, 384)
  const fbo4 = useFBO(512, 384)

  // Create a separate scene for the watched content
  const watchedScene = useMemo(() => {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#1a1a2e')
    return scene
  }, [])

  useFrame(({ gl, scene }) => {
    const cameras = [
      { cam: cam1Ref.current, fbo: fbo1, pos: [5, 4, 5], lookAt: [0, 0, 0] },
      { cam: cam2Ref.current, fbo: fbo2, pos: [-5, 4, 5], lookAt: [0, 0, 0] },
      { cam: cam3Ref.current, fbo: fbo3, pos: [0, 8, 0], lookAt: [0, 0, 0] },
      { cam: cam4Ref.current, fbo: fbo4, pos: [5, 2, -5], lookAt: [0, 0, 0] },
    ]

    cameras.forEach(({ cam, fbo, lookAt }) => {
      if (cam) {
        cam.lookAt(...(lookAt as [number, number, number]))
        gl.setRenderTarget(fbo)
        gl.render(scene, cam)
      }
    })
    gl.setRenderTarget(null)
  })

  return (
    <>
      {/* Hidden cameras */}
      <PerspectiveCamera ref={cam1Ref} position={[5, 4, 5]} fov={60} />
      <PerspectiveCamera ref={cam2Ref} position={[-5, 4, 5]} fov={60} />
      <PerspectiveCamera ref={cam3Ref} position={[0, 8, 0]} fov={60} />
      <PerspectiveCamera ref={cam4Ref} position={[5, 2, -5]} fov={60} />

      {/* Monitors */}
      <group position={[0, 2, -4]}>
        <Monitor position={[-0.8, 0.6, 0]} rotation={[0, 0, 0]} texture={fbo1.texture} label="CAM 1 - NE" />
        <Monitor position={[0.8, 0.6, 0]} rotation={[0, 0, 0]} texture={fbo2.texture} label="CAM 2 - NW" />
        <Monitor position={[-0.8, -0.6, 0]} rotation={[0, 0, 0]} texture={fbo3.texture} label="CAM 3 - TOP" />
        <Monitor position={[0.8, -0.6, 0]} rotation={[0, 0, 0]} texture={fbo4.texture} label="CAM 4 - SE" />

        {/* Monitor desk */}
        <mesh position={[0, -1.4, 0.3]}>
          <boxGeometry args={[3, 0.1, 0.8]} />
          <meshStandardMaterial color="#2d2d2d" />
        </mesh>
      </group>
    </>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} />

      <WatchedScene />
      <ControlRoom />

      <OrbitControls target={[0, 1, 0]} minDistance={5} maxDistance={15} />
    </>
  )
}

export default function SecurityCameras() {
  return (
    <Canvas renderer camera={{ position: [0, 3, 8], fov: 50 }} shadows>
      <Scene />
    </Canvas>
  )
}
