import * as THREE from 'three'
import React from 'react'
import { Canvas, useThree, useUpdate } from 'react-three-fiber'

function Rectangle() {
  const {
    camera,
    size: { width: canvasWidth, height: canvasHeight },
  } = useThree()

  const ref = useUpdate(
    geometry => {
      const vector = geometry.vertices[0].clone()
      vector.project(camera)
      const halfWidth = canvasWidth / 2
      const halfHeight = canvasHeight / 2
      vector.x = vector.x * halfWidth + halfWidth
      vector.y = -(vector.y * halfHeight) + halfHeight
      console.log('  ', vector)
    },
    [camera, canvasWidth, canvasHeight]
  )

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry ref={ref} attach="geometry" />
      <meshBasicMaterial attach="material" />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <group>
        <Rectangle />
      </group>
    </Canvas>
  )
}
