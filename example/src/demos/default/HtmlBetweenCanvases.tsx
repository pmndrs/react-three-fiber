/**
 * Demo: HTML Between Canvases
 * Features: Multi-Canvas, Scheduler, HTML Integration
 *
 * A shared 3D scene is split across two canvases so an HTML element can sit
 * between its near and far geometry.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { useRef } from 'react'
import * as THREE from 'three/webgpu'

function StandardScene() {
  const pinkRef = useRef<THREE.Mesh>(null)
  const tealRef = useRef<THREE.Mesh>(null)
  const ringGroupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(({ elapsed }, delta) => {
    // ring: constant spin on the group, oscillate position on the mesh
    const ringGroup = ringGroupRef.current
    const ring = ringRef.current
    const pink = pinkRef.current
    const teal = tealRef.current
    if (!ringGroup || !ring || !pink || !teal) return
    ringGroup.rotation.x += delta * 0.8
    ring.position.z = Math.sin(elapsed * 0.7) * 0.3
    ring.position.y = Math.cos(elapsed * 0.5) * 0.3

    // wireframe shapes: gentle tumble
    pink.rotation.x += delta * 0.3
    pink.rotation.y += delta * 0.5
    teal.rotation.x += delta * 0.4
    teal.rotation.z += delta * 0.3
  })

  // Render the far half of the scene behind the HTML layer.
  useFrame(({ renderer, camera, scene }) => renderer.render(scene, camera), { phase: 'render' })

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 1, 1]} intensity={1} />
      <group ref={ringGroupRef}>
        <mesh ref={ringRef} position={[0, 0, 0]} rotation={[-2.1, -1, 0]}>
          <torusGeometry args={[2, 0.2, 100, 16]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      </group>
      <mesh ref={pinkRef} position={[1.7, 0, 1]}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color="#f472b6" wireframe />
      </mesh>
      <mesh ref={tealRef} position={[-1.5, 1, 1]}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshBasicMaterial color="#34d399" wireframe />
      </mesh>
    </>
  )
}

export default function HtmlBetweenCanvases() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Background 3D Layer */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas id="background" renderer camera={{ near: 5, far: 1000 }}>
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
            width: 'min(36vw, 280px)',
            aspectRatio: '4 / 3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3dce5',
            borderRadius: '12px',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: 'clamp(18px, 3vw, 32px)',
            fontWeight: 600,
            letterSpacing: '0.08em',
          }}>
          HTML
        </div>
      </div>
      {/* Top Canvas - renders in front of HTML */}
      <TopCanvas />
    </div>
  )
}

const TopScene = () => {
  // Render the main scene into this canvas.
  useFrame(
    ({ primaryStore, renderer, camera }) => {
      const primaryState = primaryStore.getState()
      const primaryCamera = primaryState.camera
      camera.position.copy(primaryCamera.position)
      camera.quaternion.copy(primaryCamera.quaternion)
      renderer.render(primaryState.scene, camera)
    },
    { phase: 'render', after: 'main' },
  )

  return null
}

const TopCanvas = () => {
  // Sync the main canvas with this top canvas.
  return (
    <Canvas
      renderer={{ primaryCanvas: 'background' }}
      camera={{ near: 0.1, far: 5 }}
      style={{ background: 'transparent', position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
      <TopScene />
    </Canvas>
  )
}
