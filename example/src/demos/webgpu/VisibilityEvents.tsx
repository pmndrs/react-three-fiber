//* Visibility Events Demo ==============================
// Testing R3F's core visibility system: onFramed, onOccluded, onVisible
// This uses the built-in event handlers - no manual setup required!

import { Canvas, useLocalNodes, useUniform } from '@react-three/fiber/webgpu'
import { OrbitControls } from '@react-three/drei'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'
import { useFrame } from '@react-three/fiber'
import { color, mix } from 'three/tsl'

//* Visibility State Context ==============================
// Tracks visibility state of all demo objects for the UI

type VisibilityState = {
  planet: boolean | null // onFramed - blue orbiting sphere
  center: boolean | null // onOccluded - central sphere
  right: boolean | null // onVisible - right sphere (combined)
  cube: boolean | null // onVisible - teleporting cube
}

type VisibilityContextType = {
  state: VisibilityState
  setState: <K extends keyof VisibilityState>(key: K, value: VisibilityState[K]) => void
}

const VisibilityContext = createContext<VisibilityContextType | null>(null)

function useVisibility() {
  const ctx = useContext(VisibilityContext)
  if (!ctx) throw new Error('useVisibility must be used within VisibilityProvider')
  return ctx
}

function VisibilityProvider({ children }: { children: React.ReactNode }) {
  const [state, setFullState] = useState<VisibilityState>({
    planet: null,
    center: null,
    right: null,
    cube: null,
  })

  const setState = useCallback(<K extends keyof VisibilityState>(key: K, value: VisibilityState[K]) => {
    setFullState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const value = useMemo(() => ({ state, setState }), [state, setState])

  return <VisibilityContext.Provider value={value}>{children}</VisibilityContext.Provider>
}

//* ==============================
//* ORBITING SPHERE - Tests onFramed (frustum visibility)
//* ==============================

function OrbitingSphere() {
  const meshRef = useRef<THREE.Mesh>(null)
  const [inView, setInView] = useState(true)
  const { setState } = useVisibility()

  // make the sphere orbit the scene like a planet with diagonal orbit
  useFrame(({ elapsed }) => {
    if (!meshRef.current) return

    const orbitRadius = 10
    const orbitSpeed = 0.5
    const tilt = Math.PI * 0.15 // 15 degree tilt for diagonal orbit

    // Calculate position on elliptical orbit
    const angle = elapsed * orbitSpeed
    meshRef.current.position.x = Math.cos(angle) * orbitRadius
    meshRef.current.position.z = Math.sin(angle) * orbitRadius
    meshRef.current.position.y = Math.sin(angle) * orbitRadius * Math.sin(tilt)

    // Make sphere rotate as it orbits
    meshRef.current.rotation.y = elapsed
  })

  const handleFramed = useCallback(
    (inFrustum: boolean) => {
      setInView(inFrustum)
      setState('planet', inFrustum)
      console.log('%c[onFramed]', 'color: #3b82f6', inFrustum ? 'IN VIEW' : 'OUT OF VIEW')
    },
    [setState],
  )

  return (
    <>
      {/* Indicator plane follows the sphere */}
      <group position={[0, 1.5, 0]}>
        <planeGeometry args={[2.5, 0.5]} />
        <meshBasicMaterial color={inView ? '#22c55e' : '#ef4444'} side={THREE.DoubleSide} />
      </group>

      {/* The sphere with onFramed handler */}
      <mesh ref={meshRef} name="framed-sphere" onFramed={handleFramed}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
    </>
  )
}

//* ==============================
//* OCCLUSION TEST - Tests onOccluded (WebGPU occlusion queries)
//* ==============================

function OcclusionTest() {
  const { setState } = useVisibility()

  // Uniform for GPU-side state (drives blocker color)
  const uIsOccluded = useUniform('isOccluded', 0)

  const handleOccluded = useCallback(
    (occluded: boolean) => {
      setState('center', occluded)
      uIsOccluded.value = occluded ? 1 : 0
      console.log('%c[onOccluded]', 'color: #CC24FB', occluded ? 'OCCLUDED' : 'VISIBLE')
    },
    [setState, uIsOccluded],
  )

  return (
    <group position={[0, 0, 0]}>
      <Blocker />

      {/* Sphere behind the blocker - has onOccluded handler */}
      <mesh name="occlusion-sphere" position={[0, 0, 0]} onOccluded={handleOccluded}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#CC24FB" />
      </mesh>
    </group>
  )
}

//* ==============================
//* VISIBILITY TEST - Tests onVisible (combined check)
//* ==============================

function VisibilityTest() {
  const [isVisible, setIsVisible] = useState<boolean | null>(null)
  const { setState } = useVisibility()

  const handleVisible = useCallback(
    (visible: boolean) => {
      setIsVisible(visible)
      setState('right', visible)
      console.log('%c[onVisible]', 'color: #ec4899', visible ? 'FULLY VISIBLE' : 'NOT VISIBLE')
    },
    [setState],
  )

  return (
    <group position={[4, 0, 0]}>
      {/* Indicator plane */}
      <mesh position={[0, 2, 0]}>
        <planeGeometry args={[2.5, 0.5]} />
        <meshBasicMaterial
          color={isVisible === true ? '#22c55e' : isVisible === false ? '#ef4444' : '#888888'}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Occluding box - large enough to fully block the sphere */}
      <mesh position={[0, 0, 0.5]}>
        <boxGeometry args={[3, 3, 0.2]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>

      {/* Sphere with onVisible - combines frustum + occlusion + visible prop */}
      <mesh name="visibility-sphere" position={[0, 0, -1.5]} onVisible={handleVisible}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#ec4899" />
      </mesh>
    </group>
  )
}

//* Blocker, two planes spins around blocking the center mesh
function Blocker() {
  const groupRef = useRef<THREE.Group>(null)
  useFrame(({ elapsed }) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = elapsed
  })

  const { colorNode } = useLocalNodes(({ uniforms }) => {
    const uIsOccluded = uniforms.isOccluded as UniformNode<number>
    return {
      colorNode: mix(color('#FF0458'), color('#00FFEE'), uIsOccluded),
    }
  })
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

//* Random Cube - Tests onVisible with visible prop changes
function RandomCube() {
  const { setState } = useVisibility()
  const distance = 5
  const boxRef = useRef<THREE.Mesh>(null)
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState([2, -2, 2])

  // Toggle visibility and move position on intervals
  useEffect(() => {
    const interval = setInterval(() => setShow((s) => !s), 3000)
    const posInterval = setInterval(() => {
      setPosition([Math.random() * distance, Math.random() * distance, Math.random() * distance])
    }, 6000)
    return () => {
      clearInterval(interval)
      clearInterval(posInterval)
    }
  }, [])

  // Slow rotation on all axes
  useFrame(({ delta }) => {
    if (!boxRef.current) return
    boxRef.current.rotation.x += delta
    boxRef.current.rotation.y += delta
    boxRef.current.rotation.z += delta
  })

  const handleVisible = useCallback(
    (visible: boolean) => {
      setState('cube', visible)
      console.log('%c[onVisible:Cube]', 'color: #FF5703', visible ? 'VISIBLE' : 'HIDDEN')
    },
    [setState],
  )

  return (
    <mesh
      ref={boxRef}
      position={position}
      visible={show}
      onVisible={handleVisible}
      rotation={[Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#FF5703" />
    </mesh>
  )
}

//* Main Scene --------------------------------
function Scene() {
  return (
    <>
      <ambientLight intensity={Math.PI * 0.5} />
      <directionalLight position={[0.32, 0.39, 0.7]} intensity={1} />

      {/* Test components using R3F's visibility event handlers */}
      <OrbitingSphere />
      <OcclusionTest />
      <VisibilityTest />
      <RandomCube />

      <gridHelper args={[20, 20, '#444', '#333']} position={[0, -2, 0]} />
      <OrbitControls makeDefault minDistance={3} maxDistance={25} />
    </>
  )
}

//* Instructions --------------------------------

// Status indicator with colored dot
function StatusDot({ state }: { state: boolean | null }) {
  const bgColor = state === null ? '#666' : state ? '#22c55e' : '#ef4444'
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: bgColor,
        marginLeft: 8,
        boxShadow: state !== null ? `0 0 6px ${bgColor}` : 'none',
      }}
    />
  )
}

function Instructions() {
  const { state } = useVisibility()

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        padding: 16,
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: 8,
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        maxWidth: 480,
      }}>
      {/* WebGPU Label */}
      <div
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          marginBottom: 8,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.5px',
        }}>
        WebGPU Demo
      </div>

      <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>R3F Visibility Events</h3>

      {/* Blue Planet - onFramed */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, marginRight: 8 }}>🔵</span>
        <div style={{ flex: 1 }}>
          <strong style={{ color: '#3b82f6' }}>
            Orbiting Planet: onFramed
            <StatusDot state={state.planet} />
          </strong>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>
            Fires when object enters/exits camera frustum.
          </p>
        </div>
      </div>

      {/* Purple Center - onOccluded */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, marginRight: 8 }}>🟣</span>
        <div style={{ flex: 1 }}>
          <strong style={{ color: '#CC24FB' }}>
            Center Sphere: onOccluded
            <StatusDot state={state.center} />
          </strong>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>
            Fires when object is hidden/revealed by geometry. Blocker color reflects state via GPU uniform.
          </p>
        </div>
      </div>

      {/* Pink Right - onVisible */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, marginRight: 8 }}>🩷</span>
        <div style={{ flex: 1 }}>
          <strong style={{ color: '#ec4899' }}>
            Right Sphere: onVisible
            <StatusDot state={state.right} />
          </strong>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>
            Combined check: frustum + occlusion + visible prop.
          </p>
        </div>
      </div>

      {/* Orange Cube - onVisible */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, marginRight: 8 }}>🟧</span>
        <div style={{ flex: 1 }}>
          <strong style={{ color: '#FF5703' }}>
            Teleporting Cube: onVisible
            <StatusDot state={state.cube} />
          </strong>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>
            Toggles visible prop - onVisible fires when visibility changes.
          </p>
        </div>
      </div>

      <p style={{ margin: '12px 0 0 0', fontSize: 11, opacity: 0.6, borderTop: '1px solid #444', paddingTop: 8 }}>
        Rotate the camera to see events fire. Check console for logs.
      </p>
    </div>
  )
}

//* Main App --------------------------------
export default function VisibilityEventsDemo() {
  return (
    <VisibilityProvider>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Canvas camera={{ position: [0, 0, 7], fov: 50, near: 0.01, far: 100 }} renderer>
          <color attach="background" args={['#1a1a2e']} />
          <Scene />
        </Canvas>
        <Instructions />
      </div>
    </VisibilityProvider>
  )
}
