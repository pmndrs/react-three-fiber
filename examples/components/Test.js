import * as THREE from 'three'
import React, { useState, useEffect, useMemo } from 'react'
import { Canvas, useThree, useRender } from 'react-three-fiber'

const Cube = () => {
  const { invalidate } = useThree()

  useRender(() => {
    console.log('Render!')
    invalidate()
  })

  return (
    <mesh>
      <meshBasicMaterial attach="material" />
      <boxBufferGeometry attach="geometry" />
    </mesh>
  )
}
export default function App() {
  return (
    <Canvas invalidateFrameloop>
      <Cube />
    </Canvas>
  )
}
