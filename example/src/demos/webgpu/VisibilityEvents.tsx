//* Visibility Events ==============================

import { Canvas, useLocalNodes, useUniform } from '@react-three/fiber/webgpu'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'
import { useFrame } from '@react-three/fiber'
import { color, mix } from 'three/tsl'

const LIGHTNING_URL = '/models/lightning.gltf'
const palette = {
  background: '#0f172a',
  framed: '#38bdf8',
  occluded: '#fbbf24',
  visible: '#fb7185',
  panel: '#8b5cf6',
  panelOccluded: '#2dd4bf',
}

type VisibilityState = {
  framed: boolean | null
  occluded: boolean | null
  visible: boolean | null
}

type VisibilityChangeHandler = (event: keyof VisibilityState, value: boolean) => void

//* Orbiting sphere --------------------------------

function OrbitingSphere({ onVisibilityChange }: { onVisibilityChange: VisibilityChangeHandler }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ elapsed }) => {
    if (!meshRef.current) return

    const orbitRadius = 10
    const orbitSpeed = 0.5
    const tilt = Math.PI * 0.15

    const angle = elapsed * orbitSpeed
    meshRef.current.position.x = Math.cos(angle) * orbitRadius
    meshRef.current.position.z = Math.sin(angle) * orbitRadius
    meshRef.current.position.y = Math.sin(angle) * orbitRadius * Math.sin(tilt)
    meshRef.current.rotation.y = elapsed
  })

  const handleFramed = useCallback(
    (inFrustum: boolean) => {
      onVisibilityChange('framed', inFrustum)
    },
    [onVisibilityChange],
  )

  return (
    <mesh ref={meshRef} onFramed={handleFramed}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color={palette.framed} />
    </mesh>
  )
}

//* Occluded center shape --------------------------------

function OccludedShape({ onVisibilityChange }: { onVisibilityChange: VisibilityChangeHandler }) {
  const uIsOccluded = useUniform('isOccluded', 0)
  const { meshes } = useGLTF(LIGHTNING_URL)

  const handleOccluded = useCallback(
    (occluded: boolean) => {
      onVisibilityChange('occluded', occluded)
      uIsOccluded.value = occluded ? 1 : 0
    },
    [onVisibilityChange, uIsOccluded],
  )

  return (
    <group>
      <OrbitingPanels />
      <mesh geometry={meshes.lightning.geometry} onOccluded={handleOccluded} rotation={[Math.PI / 2, 0, 0]} scale={0.9}>
        <meshStandardMaterial color={palette.occluded} roughness={0.45} />
      </mesh>
    </group>
  )
}

function OrbitingPanels() {
  const groupRef = useRef<THREE.Group>(null)
  useFrame(({ elapsed }) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = elapsed
  })

  const uIsOccluded = useUniform<number>('isOccluded')
  const { colorNode } = useLocalNodes(() => ({
    colorNode: mix(color(palette.panel), color(palette.panelOccluded), uIsOccluded),
  }))
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh position={[0, 0, 1.5]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial colorNode={colorNode} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -1.5]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial colorNode={colorNode} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

//* Blinking cube --------------------------------

function BlinkingCube({ onVisibilityChange }: { onVisibilityChange: VisibilityChangeHandler }) {
  const boxRef = useRef<THREE.Mesh>(null)
  const target = useRef(new THREE.Vector3(3, -1, 0))
  const [show, setShow] = useState(true)

  useEffect(() => {
    const chooseTarget = () => {
      target.current.set(
        THREE.MathUtils.randFloatSpread(6),
        THREE.MathUtils.randFloat(-1.25, 1.5),
        THREE.MathUtils.randFloatSpread(3),
      )
    }

    chooseTarget()
    const movement = setInterval(chooseTarget, 1400)
    const blinking = setInterval(() => setShow((visible) => !visible), 2500)
    return () => {
      clearInterval(movement)
      clearInterval(blinking)
    }
  }, [])

  useFrame(({ delta }) => {
    if (!boxRef.current) return
    boxRef.current.position.lerp(target.current, 1 - Math.exp(-delta * 2))
    boxRef.current.rotation.x += delta
    boxRef.current.rotation.y += delta
    boxRef.current.rotation.z += delta
  })

  const handleVisible = useCallback(
    (visible: boolean) => {
      onVisibilityChange('visible', visible)
    },
    [onVisibilityChange],
  )

  return (
    <mesh ref={boxRef} position={[3, -1, 0]} visible={show} onVisible={handleVisible} rotation={[0.4, 0.6, 0]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color={palette.visible} />
    </mesh>
  )
}

//* Scene --------------------------------

function Scene({ onVisibilityChange }: { onVisibilityChange: VisibilityChangeHandler }) {
  return (
    <>
      <ambientLight intensity={Math.PI * 0.5} />
      <directionalLight position={[0.32, 0.39, 0.7]} intensity={1} />

      <OrbitingSphere onVisibilityChange={onVisibilityChange} />
      <OccludedShape onVisibilityChange={onVisibilityChange} />
      <BlinkingCube onVisibilityChange={onVisibilityChange} />

      <OrbitControls makeDefault minDistance={3} maxDistance={25} />
    </>
  )
}

//* Status --------------------------------

interface StatusIndicatorProps {
  color: string
  visible: boolean | null
  label: string
  square?: boolean
}

function StatusIndicator({ color, visible, label, square = false }: StatusIndicatorProps) {
  const state = visible === null ? 'waiting' : visible ? 'visible' : 'hidden'

  return (
    <abbr
      role="status"
      aria-label={`${label}: ${state}`}
      title={`${label}: ${state}`}
      style={{
        display: 'block',
        width: 14,
        height: 14,
        borderRadius: square ? 3 : '50%',
        background: color,
        opacity: visible === null ? 0.5 : visible ? 1 : 0.2,
        textDecoration: 'none',
        transition: 'opacity 160ms ease',
      }}
    />
  )
}

function Status({ state }: { state: VisibilityState }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        background: 'rgba(15, 23, 42, 0.82)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
      }}>
      <StatusIndicator color={palette.framed} visible={state.framed} label="Orbiting sphere · onFramed" />
      <StatusIndicator
        color={palette.occluded}
        visible={state.occluded === null ? null : !state.occluded}
        label="Center model · onOccluded"
      />
      <StatusIndicator color={palette.visible} visible={state.visible} label="Blinking cube · onVisible" square />
    </div>
  )
}

//* Main --------------------------------

export default function VisibilityEventsDemo() {
  const [state, setState] = useState<VisibilityState>({ framed: null, occluded: null, visible: null })

  const handleVisibilityChange = useCallback<VisibilityChangeHandler>((event, value) => {
    setState((previous) => (previous[event] === value ? previous : { ...previous, [event]: value }))
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 7], fov: 50, near: 0.01, far: 100 }} renderer>
        <color attach="background" args={[palette.background]} />
        <Scene onVisibilityChange={handleVisibilityChange} />
      </Canvas>
      <Status state={state} />
    </div>
  )
}

useGLTF.preload(LIGHTNING_URL)
