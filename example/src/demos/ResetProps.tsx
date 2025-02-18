import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

function AdaptivePixelRatio() {
  const gl = useThree((state) => state.gl)
  const current = useThree((state) => state.performance.current)
  const initialDpr = useThree((state) => state.viewport.initialDpr)
  const setDpr = useThree((state) => state.setDpr)

  // Restore initial pixelratio on unmount
  useEffect(() => {
    const domElement = gl.domElement
    return () => {
      setDpr(initialDpr)
      domElement.style.imageRendering = 'auto'
    }
  }, [])

  // Set adaptive pixelratio
  useEffect(() => {
    setDpr(current * initialDpr)
    gl.domElement.style.imageRendering = current === 1 ? 'auto' : 'pixelated'
  }, [current])

  return null
}

function AdaptiveEvents() {
  const get = useThree((state) => state.get)
  const current = useThree((state) => state.performance.current)

  useEffect(() => {
    const enabled = get().events.enabled
    return () => void (get().events.enabled = enabled)
  }, [])

  useEffect(() => void (get().events.enabled = current === 1), [current])

  return null
}

function Scene() {
  const group = useRef<THREE.Group>(null!)
  const [showCube, setShowCube] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setShowCube((showCube) => !showCube), 1000)
    return () => clearInterval(interval)
  }, [])

  useFrame(({ clock }) => group.current?.rotation.set(Math.sin(clock.elapsedTime), 0, 0))

  return (
    <>
      <ambientLight intensity={0.5 * Math.PI} />
      <pointLight decay={0} position={[10, 10, 10]} intensity={2} />
      <pointLight decay={0} position={[-10, -10, -10]} color="red" intensity={4} />
      <mesh scale={hovered ? 1.25 : 1} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={showCube ? 'white' : 'red'} />
      </mesh>
      <group ref={group}>
        {showCube ? (
          <mesh position={[1.5, 0, 0]}>
            <boxGeometry args={[1, 1]} />
            <meshNormalMaterial transparent opacity={0.5} />
          </mesh>
        ) : (
          <mesh>
            <icosahedronGeometry args={[1]} />
            <meshStandardMaterial color="orange" transparent opacity={0.5} />
          </mesh>
        )}
        <mesh position={[-2, -2, 0]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshPhongMaterial>
            {showCube ? <color attach="color" args={[0, 0, 1]} /> : <color attach="color" args={[1, 0, 0]} />}
          </meshPhongMaterial>
        </mesh>
      </group>
      <OrbitControls regress />
      <AdaptivePixelRatio />
      <AdaptiveEvents />
    </>
  )
}

export default function App() {
  return (
    <Canvas dpr={[1, 2]} frameloop="always" performance={{ min: 0.1 }}>
      <Scene />
    </Canvas>
  )
}
