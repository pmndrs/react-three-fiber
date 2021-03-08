import * as THREE from 'three'
import React, { memo, useEffect, useState, useRef } from 'react'
import { useThree, useFrame, extend } from 'react-three-fiber'
// @ts-ignore
import { OrbitControls } from 'three-stdlib'

extend({ OrbitControls })

const Orbit = memo(() => {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const regress = useThree((state) => state.performance.regress)
  const ref = useRef<OrbitControls>()
  useEffect(() => {
    ref.current?.connect(gl.domElement)
    ref.current?.addEventListener('change', regress)
    return () => {
      ref.current?.dispose()
      ref.current?.removeEventListener('change', regress)
    }
  }, [])
  // @ts-ignore
  return <orbitControls ref={ref} args={[camera]} />
})

function AdaptivePixelRatio() {
  const gl = useThree((state) => state.gl)
  const current = useThree((state) => state.performance.current)
  const initialPixelRatio = useThree((state) => state.viewport.initialPixelRatio)
  const setPixelRatio = useThree((state) => state.setPixelRatio)
  // Restore initial pixelratio on unmount
  useEffect(
    () => () => {
      setPixelRatio(initialPixelRatio)
      gl.domElement.style.imageRendering = 'auto'
    },
    [],
  )
  // Set adaptive pixelratio
  useEffect(() => {
    setPixelRatio(current * initialPixelRatio)
    gl.domElement.style.imageRendering = current === 1 ? 'auto' : 'pixelated'
  }, [current])
  return null
}

function AdaptiveEvents() {
  const get = useThree((state) => state.get)
  const set = useThree((state) => state.set)
  const current = useThree((state) => state.performance.current)
  useEffect(() => {
    const noninteractive = get().noninteractive
    return () => set({ noninteractive })
  }, [])
  useEffect(() => set({ noninteractive: current < 1 }), [current])
  return null
}

export default function App() {
  const group = useRef<THREE.Group>()
  const [showCube, setShowCube] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [color, setColor] = useState('pink')

  useEffect(() => {
    const interval = setInterval(() => setShowCube((showCube) => !showCube), 1000)
    return () => clearInterval(interval)
  }, [])

  useFrame(({ clock }) => group.current?.position.set(Math.sin(clock.elapsedTime), 0, 0))

  return (
    <>
      <color attach="background" args={[color] as any} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={2} />
      <pointLight position={[-10, -10, -10]} color="red" intensity={4} />
      <group ref={group}>
        <mesh
          scale={hovered ? 1.25 : 1}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={() => setColor(color === 'pink' ? 'peachpuff' : 'pink')}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={showCube ? 'white' : 'red'} />
        </mesh>
        {showCube ? (
          <mesh position={[1.5, 0, 0]}>
            <boxGeometry args={[1, 1]} />
            <meshStandardMaterial color="hotpink" />
          </mesh>
        ) : (
          <mesh>
            <icosahedronGeometry args={[1]} />
            <meshStandardMaterial color="orange" transparent opacity={0.5} />
          </mesh>
        )}
      </group>
      <Orbit />
      <AdaptivePixelRatio />
      <AdaptiveEvents />
    </>
  )
}
