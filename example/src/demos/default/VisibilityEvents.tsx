//* Visibility Events Demo ==============================
// Testing R3F's core visibility system: onFramed, onOccluded, onVisible
// This uses the built-in event handlers - no manual setup required!

import { Canvas, useThree } from '@react-three/fiber/webgpu'
import { OrbitControls, Text } from '@react-three/drei'
import { useRef, useState } from 'react'
import * as THREE from 'three/webgpu'

//* ==============================
//* ORBITING SPHERE - Tests onFramed (frustum visibility)
//* ==============================

function OrbitingSphere() {
  const meshRef = useRef<THREE.Mesh>(null)
  const [inView, setInView] = useState(true)

  return (
    <group position={[-4, 0, 0]}>
      {/* Indicator plane */}
      <mesh position={[0, 2, 0]}>
        <planeGeometry args={[2.5, 0.5]} />
        <meshBasicMaterial color={inView ? '#22c55e' : '#ef4444'} side={THREE.DoubleSide} />
      </mesh>

      {/* The sphere with onFramed handler */}
      <mesh
        ref={meshRef}
        name="framed-sphere"
        onFramed={(inFrustum: boolean) => {
          setInView(inFrustum)
          console.log('%c[onFramed]', 'color: #22c55e', inFrustum ? 'IN VIEW' : 'OUT OF VIEW')
        }}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
    </group>
  )
}

//* ==============================
//* OCCLUSION TEST - Tests onOccluded (WebGPU occlusion queries)
//* ==============================

function OcclusionTest() {
  const [isOccluded, setIsOccluded] = useState<boolean | null>(null)

  return (
    <group position={[0, 0, 0]}>
      {/* Indicator plane - shows occlusion state */}
      <mesh position={[0, 2, 0]}>
        <planeGeometry args={[2.5, 0.5]} />
        <meshBasicMaterial
          color={isOccluded === true ? '#00ff00' : isOccluded === false ? '#0000ff' : '#888888'}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Occluding box - large enough to fully block the sphere */}
      <mesh position={[0, 0, 0.5]}>
        <boxGeometry args={[3, 3, 0.2]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>

      {/* Sphere behind the box - has onOccluded handler */}
      <mesh
        name="occlusion-sphere"
        position={[0, 0, -1.5]}
        onOccluded={(occluded: boolean) => {
          setIsOccluded(occluded)
          console.log('%c[onOccluded]', 'color: #a855f7', occluded ? 'OCCLUDED' : 'VISIBLE')
        }}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    </group>
  )
}

//* ==============================
//* VISIBILITY TEST - Tests onVisible (combined check)
//* ==============================

function VisibilityTest() {
  const [isVisible, setIsVisible] = useState<boolean | null>(null)

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
      <mesh
        name="visibility-sphere"
        position={[0, 0, -1.5]}
        onVisible={(visible: boolean) => {
          setIsVisible(visible)
          console.log('%c[onVisible]', 'color: #f472b6', visible ? 'FULLY VISIBLE' : 'NOT VISIBLE')
        }}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#ec4899" />
      </mesh>
    </group>
  )
}

//* ==============================
//* SCENE INFO - Shows internal state (debug)
//* ==============================

function SceneInfo() {
  const { internal } = useThree()

  // Log internal state periodically for debugging
  useRef<number>(0)

  useState(() => {
    const interval = setInterval(() => {
      // Access via any to avoid type errors with unrebuilt package
      const internalAny = internal as any
      console.log('%c[Internal State]', 'color: #64748b', {
        registry: internalAny.visibilityRegistry?.size ?? 0,
        cache: internalAny.occlusionCache?.size ?? 0,
        helperGroup: !!internalAny.helperGroup,
        occlusionEnabled: !!internalAny.occlusionEnabled,
      })
    }, 5000) // Log every 5 seconds
    return () => clearInterval(interval)
  })

  return null
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

      <SceneInfo />

      <gridHelper args={[20, 20, '#444', '#333']} position={[0, -2, 0]} />
      <OrbitControls makeDefault minDistance={3} maxDistance={25} />
    </>
  )
}

//* Instructions --------------------------------
function Instructions() {
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
      <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>R3F Visibility Events Demo</h3>

      <div style={{ marginBottom: 12 }}>
        <strong style={{ color: '#22c55e' }}>LEFT: onFramed (frustum)</strong>
        <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>
          Fires when object enters/exits camera frustum.
          <br />
          GREEN = in view, RED = out of view
        </p>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong style={{ color: '#a855f7' }}>CENTER: onOccluded (WebGPU)</strong>
        <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>
          Fires when object is hidden/revealed by other geometry.
          <br />
          GREEN = occluded, BLUE = visible, GRAY = no data
        </p>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong style={{ color: '#f472b6' }}>RIGHT: onVisible (combined)</strong>
        <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>
          Fires when combined visibility changes (frustum + occlusion + visible prop).
          <br />
          GREEN = fully visible, RED = not visible
        </p>
      </div>

      <p style={{ margin: '12px 0 0 0', fontSize: 11, opacity: 0.6, borderTop: '1px solid #444', paddingTop: 8 }}>
        Rotate the camera to see occlusion events fire.
        <br />
        Check console for event logs. The __r3fInternal group is auto-created for occlusion.
      </p>
    </div>
  )
}

//* Main App --------------------------------
export default function VisibilityEventsDemo() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 7], fov: 50, near: 0.01, far: 100 }} renderer>
        <color attach="background" args={['#1a1a2e']} />
        <Scene />
      </Canvas>
      <Instructions />
    </div>
  )
}
