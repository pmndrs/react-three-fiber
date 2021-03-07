import * as THREE from 'three'
import React, { memo, useEffect, useState, useRef } from 'react'
import { useThree, useFrame, extend } from 'react-three-fiber'
// @ts-ignore
import { OrbitControls } from 'three-stdlib'

extend({ OrbitControls })

const Orbit = memo(() => {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
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
  const current = useThree((state) => state.performance.current)
  const setPixelRatio = useThree((state) => state.setPixelRatio)
  useEffect(() => {
    setPixelRatio(current * 2)
    document.body.style.imageRendering = current === 1 ? 'auto' : 'pixelated'
  }, [current])
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
      <group ref={group}>
        <mesh
          scale={hovered ? 1.5 : 1}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={() => setColor(color === 'pink' ? 'yellow' : 'pink')}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial color={showCube ? 0x0000ff : 0xff0000} />
        </mesh>
        {showCube ? (
          <mesh position={[2, 0, 0]}>
            <boxGeometry args={[1, 1]} />
            <meshNormalMaterial transparent opacity={0.5} />
          </mesh>
        ) : (
          <mesh>
            <icosahedronGeometry args={[1]} />
            <meshBasicMaterial color="orange" transparent opacity={0.5} />
          </mesh>
        )}
      </group>
      <Orbit />
      <AdaptivePixelRatio />
    </>
  )
}
