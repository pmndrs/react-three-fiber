import * as THREE from 'three'
import React, { useEffect, useState } from 'react'
import { Canvas, useFrame, invalidate } from 'react-three-fiber'

function Contents() {
  return (
    <>
      <sphereBufferGeometry attach="geometry" />
      <meshBasicMaterial attach="material" color="hotpink" />
    </>
  )
}

function Test() {
  const [pos, set] = useState([0, 0, 0])
  useEffect(() => void setTimeout(() => set(undefined), 1000), [])
  useEffect(() => void setTimeout(() => set(new THREE.Vector3(1, 1, 1)), 2000), [])

  return (
    <mesh position={pos}>
      <Contents />
    </mesh>
  )
}

export default function() {
  const [show, set] = useState(true)
  useEffect(() => {
    setTimeout(() => {
      invalidate(true)
      invalidate(true)
      invalidate(true)
    }, 1000)
  }, [])
  return (
    <Canvas invalidateFrameloop style={{ background: '#272730' }}>
      {show && <Test />}
    </Canvas>
  )
}
