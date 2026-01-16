//* Visibility Events Demo ==============================
// Testing R3F's core visibility system: onFramed, onOccluded, onVisible
// This uses the built-in event handlers - no manual setup required!

import { Canvas, useLocalNodes, useThree, useUniform } from '@react-three/fiber/webgpu'
import { OrbitControls, Text } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'
import { useFrame } from '@react-three/fiber'
import { color, int, mix } from 'three/tsl'

//* ==============================
//* ORBITING SPHERE - Tests onFramed (frustum visibility)
//* ==============================

function OrbitingSphere() {
  const meshRef = useRef<THREE.Mesh>(null)
  const [inView, setInView] = useState(true)

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

  return (
    <>
      {/* Indicator plane follows the sphere */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <group position={[0, 1.5, 0]}>
          <planeGeometry args={[2.5, 0.5]} />
          <meshBasicMaterial color={inView ? '#22c55e' : '#ef4444'} side={THREE.DoubleSide} />
        </group>

        {/* The sphere with onFramed handler */}
        <mesh
          name="framed-sphere"
          onFramed={(inFrustum: boolean) => {
            setInView(inFrustum)
            console.log('%c[onFramed]', 'color: #22c55e', inFrustum ? 'IN VIEW' : 'OUT OF VIEW')
          }}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
      </mesh>
    </>
  )
}

//* ==============================
//* OCCLUSION TEST - Tests onOccluded (WebGPU occlusion queries)
//* ==============================

function OcclusionTest() {
  // track with a CPU accessible state
  const [isOccluded, setIsOccluded] = useState<boolean | null>(null)

  const uIsOccluded = useUniform('isOccluded', 0)

  const handleOccluded = useCallback(
    (occluded: boolean) => {
      setIsOccluded(occluded)
      uIsOccluded.value = occluded ? 1 : 0
    },
    [uIsOccluded],
  )

  return (
    <group position={[0, 0, 0]}>
      <Blocker />

      {/* Sphere behind the box - has onOccluded handler */}
      <mesh name="occlusion-sphere" position={[0, 0, 0]} onOccluded={(occluded: boolean) => handleOccluded(occluded)}>
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

//* Random cube
function RandomCube() {
  // for 3 seconds show visible then 3 seconds off and bounce around the scene
  const distance = 5
  const boxRef = useRef<THREE.Mesh>(null)
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState([2, -2, 2])
  // use an effect with timeouts for this logic
  useEffect(() => {
    const interval = setInterval(() => {
      setShow((show) => !show)
    }, 3000)
    // every 6 seconds move the cube to a random position
    const randomPosition = () => {
      setPosition([Math.random() * distance, Math.random() * distance, Math.random() * distance])
    }
    const posInterval = setInterval(randomPosition, 6000)
    return () => {
      clearInterval(interval)
      clearInterval(posInterval)
    }
  }, [])

  // slow rotation in all axis
  useFrame(({ delta }) => {
    if (!boxRef.current) return
    boxRef.current.rotation.x += delta
    boxRef.current.rotation.y += delta
    boxRef.current.rotation.z += delta
  })

  return (
    <mesh
      ref={boxRef}
      position={position}
      visible={show}
      rotation={[Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color={'#FF5703'} />
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
