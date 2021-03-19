import * as THREE from 'three'
import React, { memo, useEffect, useState, useRef } from 'react'
import { useThree, useFrame, extend } from 'react-three-fiber'
// @ts-ignore
import { OrbitControls } from 'three-stdlib'

extend({ OrbitControls })

const Orbit = memo(() => {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)
  const regress = useThree((state) => state.performance.regress)
  const ref = useRef<OrbitControls>()
  useEffect(() => {
    const onChange = () => (regress(), invalidate())
    ref.current?.connect(gl.domElement)
    ref.current?.addEventListener('change', onChange)
    return () => {
      ref.current?.dispose()
      ref.current?.removeEventListener('change', onChange)
    }
  }, [])
  // @ts-ignore
  return <orbitControls ref={ref} args={[camera]} />
})

function AdaptivePixelRatio() {
  const gl = useThree((state) => state.gl)
  const current = useThree((state) => state.performance.current)
  const initialDpr = useThree((state) => state.viewport.initialDpr)
  const setDpr = useThree((state) => state.setDpr)
  // Restore initial pixelratio on unmount
  useEffect(
    () => () => {
      setDpr(initialDpr)
      gl.domElement.style.imageRendering = 'auto'
    },
    [],
  )
  // Set adaptive pixelratio
  useEffect(() => {
    setDpr(current * initialDpr)
    gl.domElement.style.imageRendering = current === 1 ? 'auto' : 'pixelated'
  }, [current])
  return null
}

function AdaptiveEvents() {
  const get = useThree((state) => state.get)
  const set = useThree((state) => state.set)
  const current = useThree((state) => state.performance.current)
  useEffect(() => {
    const enabled = get().raycaster.enabled
    return () => void (get().raycaster.enabled = enabled)
  }, [])
  useEffect(() => void (get().raycaster.enabled = current === 1), [current])
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

  useFrame(({ clock }) => group.current?.rotation.set(Math.sin(clock.elapsedTime), 0, 0))

  return (
    <>
      <color attach="background" args={[color] as any} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={2} />
      <pointLight position={[-10, -10, -10]} color="red" intensity={4} />

      <mesh
        scale={hovered ? 1.25 : 1}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => setColor(color === 'pink' ? 'peachpuff' : 'pink')}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={showCube ? 'white' : 'red'} />
      </mesh>
      <group ref={group}>
        {showCube ? (
          <mesh position={[1.5, 0, 0]}>
            <boxGeometry args={[1, 1]} />
            <meshNormalMaterial color="hotpink" transparent opacity={0.5} />
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
      <Orbit />
      <AdaptivePixelRatio />
      <AdaptiveEvents />
    </>
  )
}
