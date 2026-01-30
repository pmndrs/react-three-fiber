/**
 * Demo: Magic Mirror
 * Features: Portal, useRenderTarget, Camera
 *
 * Mirror in scene that shows reflection with a twist -
 * different lighting, time of day, or visual style.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { OrbitControls, useFBO, Environment } from '@react-three/drei'
import { Float } from '@/shared/Float'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'

function FloatingObjects() {
  const group = useRef<THREE.Group>(null)

  useFrame(({ elapsed }) => {
    if (group.current) {
      group.current.rotation.y = elapsed * 0.2
    }
  })

  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.5}>
        <mesh position={[1.5, 1, 0]} castShadow>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial color="#e74c3c" metalness={0.5} roughness={0.2} />
        </mesh>
      </Float>

      <Float speed={1.5} rotationIntensity={0.3}>
        <mesh position={[-1.5, 0.8, 0.5]} castShadow>
          <dodecahedronGeometry args={[0.35]} />
          <meshStandardMaterial color="#3498db" metalness={0.5} roughness={0.2} />
        </mesh>
      </Float>

      <Float speed={1.8} rotationIntensity={0.4}>
        <mesh position={[0, 1.5, -1]} castShadow>
          <icosahedronGeometry args={[0.3]} />
          <meshStandardMaterial color="#2ecc71" metalness={0.5} roughness={0.2} />
        </mesh>
      </Float>
    </group>
  )
}

function MirrorWorld({ position }: { position: [number, number, number] }) {
  // This is the "alternate reality" seen in the mirror
  return (
    <group position={position}>
      {/* Different lighting - warmer, sunset-like */}
      <ambientLight intensity={0.2} color="#ff9966" />
      <directionalLight position={[-5, 8, -5]} intensity={1.5} color="#ff6633" />

      {/* Mirrored objects with different colors */}
      <Float speed={2} rotationIntensity={0.5}>
        <mesh position={[-1.5, 1, 0]} castShadow>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial color="#9b59b6" metalness={0.8} roughness={0.1} />
        </mesh>
      </Float>

      <Float speed={1.5} rotationIntensity={0.3}>
        <mesh position={[1.5, 0.8, 0.5]} castShadow>
          <dodecahedronGeometry args={[0.35]} />
          <meshStandardMaterial color="#f39c12" metalness={0.8} roughness={0.1} />
        </mesh>
      </Float>

      <Float speed={1.8} rotationIntensity={0.4}>
        <mesh position={[0, 1.5, 1]} castShadow>
          <icosahedronGeometry args={[0.3]} />
          <meshStandardMaterial color="#e91e63" metalness={0.8} roughness={0.1} />
        </mesh>
      </Float>

      {/* Ground with different color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#4a235a" />
      </mesh>
    </group>
  )
}

function MagicMirrorPortal() {
  const mirrorCameraRef = useRef<THREE.PerspectiveCamera>(null)
  const renderTarget = useFBO(1024, 1024)
  const { camera, scene } = useThree()

  // Create alternate scene
  const mirrorScene = useMemo(() => {
    const altScene = new THREE.Scene()
    altScene.background = new THREE.Color('#2c1445')
    return altScene
  }, [])

  useFrame(({ gl }) => {
    if (mirrorCameraRef.current) {
      // Mirror camera copies main camera but flipped
      mirrorCameraRef.current.position.copy(camera.position)
      mirrorCameraRef.current.position.z *= -1
      mirrorCameraRef.current.rotation.copy(camera.rotation)
      mirrorCameraRef.current.rotation.y *= -1

      gl.setRenderTarget(renderTarget)
      gl.render(mirrorScene, mirrorCameraRef.current)
      gl.setRenderTarget(null)
    }
  })

  return (
    <>
      {/* Mirror camera */}
      <perspectiveCamera ref={mirrorCameraRef} fov={50} />

      {/* Mirror frame */}
      <group position={[0, 1.5, -3]}>
        {/* Ornate frame */}
        <mesh>
          <boxGeometry args={[3.4, 4.4, 0.2]} />
          <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.3} />
        </mesh>

        {/* Mirror surface */}
        <mesh position={[0, 0, 0.11]}>
          <planeGeometry args={[3, 4]} />
          <meshBasicMaterial map={renderTarget.texture} />
        </mesh>

        {/* Magical glow */}
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[3.1, 4.1]} />
          <meshBasicMaterial color="#9b59b6" transparent opacity={0.1} />
        </mesh>
      </group>

      {/* Render alternate world to mirror scene */}
      {mirrorScene && (
        // @ts-ignore - createPortal typing
        <primitive object={mirrorScene}>
          <MirrorWorld position={[0, 0, 0]} />
        </primitive>
      )}
    </>
  )
}

function Scene() {
  const { showGuide } = useControls({
    showGuide: { value: true, label: 'Show Instructions' },
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />

      <FloatingObjects />
      <MagicMirrorPortal />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Wall behind mirror */}
      <mesh position={[0, 3, -3.5]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#2d2d44" />
      </mesh>

      <OrbitControls target={[0, 1.5, 0]} minDistance={4} maxDistance={12} maxPolarAngle={Math.PI / 2} />

      <Environment preset="city" />
    </>
  )
}

export default function MagicMirror() {
  return (
    <Canvas renderer camera={{ position: [4, 2, 6], fov: 50 }} shadows>
      <Scene />
    </Canvas>
  )
}
