import React, { useState, useCallback, useRef } from 'react'
import { Canvas } from 'react-three-fiber'
import * as THREE from 'three'

function Ball() {
  const [pos, setPos] = useState(new THREE.Vector3())
  const isPressed = useRef(false)

  const onPointerDown = useCallback((e) => {
    isPressed.current = true
    e.target.setPointerCapture(e.pointerId)
  }, [])

  const onPointerUp = useCallback((e) => {
    isPressed.current = false
    e.target.releasePointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (isPressed.current) {
      setPos(e.unprojectedPoint.clone().setZ(0))
    }
  }, [])

  return (
    <mesh position={pos} onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <boxBufferGeometry attach="geometry" args={[10, 32, 32]} />
      <meshBasicMaterial attach="material" color={0x000000} />
    </mesh>
  )
}

function Cube() {
  const onPointerOver = useCallback((e) => {
    e.stopPropagation()
  }, [])

  return (
    <mesh onPointerOver={onPointerOver} position={new THREE.Vector3(0, 0, -20)}>
      <boxBufferGeometry attach="geometry" args={[800, 400, 40]} />
      <meshBasicMaterial attach="material" color={0xfcfc00} />
    </mesh>
  )
}

export default function App() {
  const [count, setCount] = useState(0)

  const onButtonClick = useCallback(() => setCount(count + 1), [count])

  return (
    <>
      <Canvas
        gl={{ alpha: false, antialias: false, logarithmicDepthBuffer: true }}
        camera={{ fov: 75, position: [0, 0, 70] }}
        orthographic
        onCreated={({ gl }) => {
          gl.setClearColor('white')
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.outputEncoding = THREE.sRGBEncoding
        }}>
        <ambientLight intensity={1.1} />
        <pointLight position={[100, 100, 100]} intensity={2.2} />
        <pointLight position={[-100, -100, -100]} intensity={5} color="red" />

        <Ball />
        <Cube />
      </Canvas>
    </>
  )
}
