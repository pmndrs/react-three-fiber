import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { useMemo, useRef } from 'react'
import * as THREE from 'three/webgpu'

/**
 * Multi-Canvas WebGPU Demo
 *
 * Demonstrates sharing a single WebGPURenderer across multiple Canvas components
 * using the `id` and `renderer={{ primaryCanvas }}` props with Three.js CanvasTarget API.
 *
 * - Primary canvas: has `id` prop, creates and owns the WebGPURenderer
 * - Secondary canvases: use `renderer={{ primaryCanvas: "id" }}` to share the renderer
 *
 * Each canvas maintains its own scene, camera, and events.
 *
 * Scheduler options:
 * - `after`: Render this canvas after another canvas completes
 * - `fps`: Limit this canvas's render rate
 */

function RotatingBox({ color = 'orange' }: { color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    meshRef.current.rotation.x += delta
    meshRef.current.rotation.y += delta * 0.5
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function RotatingSphere({ color = 'hotpink' }: { color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    meshRef.current.rotation.y += delta * 0.8
    meshRef.current.position.y = Math.sin(Date.now() * 0.002) * 0.3
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function RotatingTorus({ color = 'cyan' }: { color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    meshRef.current.rotation.x += delta * 0.5
    meshRef.current.rotation.z += delta
  })

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[0.5, 0.2, 16, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function CanvasInfo() {
  const { internal } = useThree()
  const isSecondary = internal.isSecondary

  return (
    <group position={[0, -1.2, 0]}>
      <mesh>
        <planeGeometry args={[2, 0.4]} />
        <meshBasicMaterial color={isSecondary ? '#2A0CBD' : '#222'} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

// hud scene looks down on the first scene with an ortho cam

const HudScene = () => {
  const { size } = useThree()
  const myOrthoCam = useMemo(() => {
    const aspect = size.width / size.height
    const camera = new THREE.OrthographicCamera(-3 * aspect, 3 * aspect, 3, -3, 0.1, 1000)
    camera.position.set(0, 10, 0)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    return camera
  }, [size])

  useFrame(
    ({ primaryStore, renderer }) => {
      const primaryState = primaryStore.getState()
      renderer.render(primaryState.scene, myOrthoCam)
    },
    { phase: 'render', fps: 5, after: 'main' },
  )
  return null
}

export default function WebGPUMultiCanvas() {
  return (
    <div style={{ display: 'flex', gap: '10px', width: '100%', height: '100%', padding: '10px' }}>
      {/* Primary Canvas - creates the WebGPURenderer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'white', marginBottom: '5px', fontSize: '12px' }}>
          Primary Canvas (id="main") - Owns Renderer
        </div>
        <div style={{ flex: 1, border: '2px solid #4a4', borderRadius: '8px', overflow: 'hidden' }}>
          <Canvas id="main" renderer>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <RotatingBox color="orange" />
            <OrbitControls />
            <CanvasInfo />
          </Canvas>
        </div>
      </div>

      {/* Hud Style */}
      <div
        style={{
          position: 'absolute',
          width: '200px',
          height: '160px',
          top: 30,
          left: 10,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}>
        <div
          style={{
            position: 'absolute',
            textAlign: 'right',
            bottom: 2,
            right: 8,
            color: 'white',
            marginBottom: '5px',
            fontSize: '12px',
          }}>
          Hud Shared Scene, <br /> Ortho Cam, 5fps
        </div>
        <div style={{ flex: 1, border: '2px solid #4aa', borderRadius: '8px', overflow: 'hidden' }}>
          <Canvas id="hudCanvas" renderer={{ primaryCanvas: 'main', scheduler: { fps: 30 } }}>
            <HudScene />
          </Canvas>
        </div>
      </div>

      {/* Secondary Canvas 1 - shares the renderer, renders after primary */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'white', marginBottom: '5px', fontSize: '12px' }}>
          Secondary Canvas (renderer.primaryCanvas) - Renders after "main"
        </div>
        <div style={{ flex: 1, border: '2px solid #a4a', borderRadius: '8px', overflow: 'hidden' }}>
          <Canvas renderer={{ primaryCanvas: 'main', scheduler: { after: 'main' } }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[-5, 5, 5]} intensity={1} />
            <RotatingSphere color="hotpink" />
            <CanvasInfo />
          </Canvas>
        </div>
      </div>

      {/* Secondary Canvas 2 - also shares the renderer, limited to 30fps */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'white', marginBottom: '5px', fontSize: '12px' }}>
          Secondary Canvas (renderer.primaryCanvas) - Limited to 30fps
        </div>
        <div style={{ flex: 1, border: '2px solid #4aa', borderRadius: '8px', overflow: 'hidden' }}>
          <Canvas renderer={{ primaryCanvas: 'main', scheduler: { fps: 30 } }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[0, 5, -5]} intensity={1} />
            <RotatingTorus color="cyan" />
            <CanvasInfo />
          </Canvas>
        </div>
      </div>
    </div>
  )
}
