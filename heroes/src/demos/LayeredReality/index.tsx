/**
 * Demo: Layered Reality
 * Features: Multi-Canvas, Scheduler, HTML Integration
 *
 * 3D website where HTML content sits BETWEEN two 3D layers.
 * Front layer has floating UI elements, back layer has the scene.
 * True depth perception impossible with single canvas.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const cameraDepth = 5

function StandardScene() {
  const meshRef = useRef<THREE.Mesh>(null)

  const { camera } = useThree()
  useEffect(() => {
    setTimeout(() => {
      camera.near = cameraDepth
      camera.far = 1000
    }, 1000)

    console.log('running')
  }, [camera])

  return (
    <>
      <mesh ref={meshRef} position={[2, 1, 2]}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color="#f472b6" wireframe />
      </mesh>
      <mesh position={[-2, -1, 1]}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshBasicMaterial color="#34d399" wireframe />
      </mesh>
    </>
  )
}

export default function LayeredReality() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Background 3D Layer */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas id="background" renderer>
          <StandardScene />
        </Canvas>
      </div>

      {/* HTML Content Layer - sits BETWEEN the 3D layers */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '48px 64px',
            borderRadius: '16px',
            textAlign: 'center',
            color: 'white',
            pointerEvents: 'auto',
          }}>
          <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>Layered Reality</h1>
          <p style={{ fontSize: '18px', opacity: 0.8, maxWidth: '400px' }}>
            HTML content sits between two 3D canvas layers.
            <br />
            Notice the wireframe shapes in front of this text.
          </p>
        </div>
      </div>
    </div>
  )
}

const TopDriver = () => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  // drive the subcanvas render here
  useFrame(
    ({ primaryStore, renderer }) => {
      const primaryState = primaryStore.getState()
      const primaryScene = primaryState.scene
      const primaryCamera = primaryState.camera
      if (cameraRef.current) {
        cameraRef.current.position.copy(primaryCamera.position)
        cameraRef.current.quaternion.copy(primaryCamera.quaternion)
        //  renderer.render(primaryScene, cameraRef.current)
      }
    },
    { phase: 'render', after: 'main' },
  )

  return (
    <>
      {/* Foreground 3D Layer - renders in front of HTML */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <Canvas renderer style={{ background: 'transparent' }} camera={{ position: [0, 0, 5], fov: 50 }}>
          <PerspectiveCamera makeDefault />
        </Canvas>
      </div>
    </>
  )
}
