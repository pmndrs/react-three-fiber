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
  useFrame(() => {
    console.log('render')
  })

  return (
    <mesh dispose={null}>
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
