import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { useMemo, useRef } from 'react'
import * as THREE from 'three/webgpu'

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

  useFrame(({ elapsed }, delta) => {
    meshRef.current.rotation.y += delta * 0.8
    meshRef.current.position.y = Math.sin(elapsed * 2) * 0.3
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

function FpsLabel({ fps, color }: { fps: number; color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        top: 12,
        color,
        opacity: 0.45,
        font: '600 12px system-ui, sans-serif',
        pointerEvents: 'none',
      }}>
      {fps} FPS
    </div>
  )
}

function HudScene() {
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 2,
        width: '100%',
        height: '100%',
        background: '#111',
      }}>
      <div
        style={{
          position: 'relative',
          gridRow: '1 / 3',
          overflow: 'hidden',
        }}>
        <Canvas id="main" renderer camera={{ position: [0, 0, 4], fov: 45 }}>
          <color attach="background" args={['#211813']} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={2} />
          <RotatingBox />
          <OrbitControls />
        </Canvas>
        <FpsLabel fps={60} color="orange" />
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
            width: '34%',
            maxWidth: 180,
            minWidth: 110,
            aspectRatio: '4 / 3',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.25)',
          }}>
          <Canvas renderer={{ primaryCanvas: 'main', scheduler: { fps: 30 } }}>
            <HudScene />
          </Canvas>
          <FpsLabel fps={5} color="orange" />
        </div>
      </div>

      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <Canvas renderer={{ primaryCanvas: 'main', scheduler: { after: 'main' } }} camera={{ position: [0, 0, 4] }}>
          <color attach="background" args={['#241522']} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[-5, 5, 5]} intensity={2} />
          <RotatingSphere />
        </Canvas>
        <FpsLabel fps={60} color="hotpink" />
      </div>

      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <Canvas renderer={{ primaryCanvas: 'main', scheduler: { fps: 30 } }} camera={{ position: [0, 0, 4] }}>
          <color attach="background" args={['#102224']} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[0, 5, -5]} intensity={2} />
          <RotatingTorus />
        </Canvas>
        <FpsLabel fps={30} color="cyan" />
      </div>
    </div>
  )
}
