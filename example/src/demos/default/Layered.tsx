/**
 * Demo: Layered Reality
 * Features: Multi-Canvas, Scheduler, HTML Integration
 *
 * 3D website where HTML content sits BETWEEN two 3D layers.
 * Front layer has floating UI elements, back layer has the scene.
 * True depth perception impossible with single canvas.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { useRef, useState } from 'react'
import * as THREE from 'three/webgpu'

type RenderMode = 'top' | 'bottom' | 'both'

function StandardScene({ renderMode = 'top' }: { renderMode: RenderMode }) {
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

  // take over render loop to be able to split/stop rendering
  useFrame(
    ({ renderer, camera, scene }) => {
      if (['bottom', 'both'].includes(renderMode)) {
        renderer.render(scene, camera)
      }
    },
    { phase: 'render' },
  )

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

export default function LayeredReality() {
  const [renderMode, setRenderMode] = useState<'top' | 'bottom' | 'both'>('both')

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* mode controls */}
      <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10000 }}>
        <button onClick={() => setRenderMode('top')}>Top</button>
        <button onClick={() => setRenderMode('bottom')}>Bottom</button>
        <button onClick={() => setRenderMode('both')}>Both</button>
      </div>

      {/* Background 3D Layer */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas id="background" renderer camera={{ near: 5, far: 1000 }}>
          <StandardScene renderMode={renderMode} />
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
          <p
            style={{
              fontSize: '18px',
              opacity: 0.8,
              maxWidth: '400px',
            }}>
            HTML content sits between two 3D canvas layers.
            <br />
            Notice the ring and wireframe shapes in front of this text.
          </p>
        </div>
      </div>
      {/* Top Canvas - renders in front of HTML */}
      <TopCanvas renderMode={renderMode} />
    </div>
  )
}

const TopScene = ({ renderMode = 'top' }: { renderMode: 'top' | 'bottom' | 'both' }) => {
  // Render the main scene into this canvas.
  useFrame(
    ({ primaryStore, renderer, camera }) => {
      const primaryState = primaryStore.getState()
      const primaryCamera = primaryState.camera
      camera.position.copy(primaryCamera.position)
      camera.quaternion.copy(primaryCamera.quaternion)
      if (['top', 'both'].includes(renderMode)) {
        renderer.render(primaryState.scene, camera)
      }
    },
    { phase: 'render', after: 'main' },
  )

  return null
}

const TopCanvas = ({ renderMode = 'top' }: { renderMode: 'top' | 'bottom' | 'both' }) => {
  // Sync the main canvas with this top canvas.
  return (
    <Canvas
      renderer={{ primaryCanvas: 'background' }}
      camera={{ near: 0.1, far: 5 }}
      style={{ background: 'transparent', position: 'absolute', inset: 0, zIndex: 200, pointerEvents: 'none' }}>
      <TopScene renderMode={renderMode} />
    </Canvas>
  )
}
