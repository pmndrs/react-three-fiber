import * as THREE from 'three/src/Three'
import React, { useState, useEffect, useMemo } from 'react'
import { Canvas } from 'react-three-fiber'

const CubePrimitive = ({ size }) => {
  const geometry = useMemo(() => new THREE.BoxBufferGeometry(size, size, size), [size])
  return (
    <mesh position-x={2}>
      <primitive object={geometry} attach="geometry" />
      <meshBasicMaterial attach="material" color="#ff3f34" />
    </mesh>
  )
}

const Cube = ({ size }) => {
  const geometry = useMemo(() => new THREE.BoxBufferGeometry(size, size, size), [size])
  return (
    <mesh geometry={geometry} position-x={-2}>
      <meshBasicMaterial attach="material" color="#05c46b" />
    </mesh>
  )
}

const Content = () => {
  const [size, setSize] = useState(1)

  useEffect(() => {
    setInterval(() => {
      setSize(size => (size >= 2 ? 1 : size + 0.5))
    }, 1000)
  }, [])

  return (
    <Canvas>
      <Cube size={size} />
      <CubePrimitive size={size} />
    </Canvas>
  )
}

export default Content
