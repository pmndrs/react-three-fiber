import React, { useEffect, useState } from 'react'
import { Canvas } from 'react-three-fiber'

function Contents() {
  return (
    <>
      <sphereBufferGeometry attach="geometry" />
      <meshBasicMaterial attach="material" color="hotpink" />
    </>
  )
}

function Test() {
  return (
    <mesh dispose={null}>
      <Contents />
    </mesh>
  )
}

export default function() {
  const [show, set] = useState(true)
  useEffect(() => setTimeout(() => set(false), 2000), [])
  return <Canvas style={{ background: '#272730' }}>{show && <Test />}</Canvas>
}
