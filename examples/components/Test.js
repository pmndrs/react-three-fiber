import * as THREE from 'three'
import React from 'react'
import { Canvas, useThree, useUpdate } from 'react-three-fiber'

function Rectangle() {
  const {
    gl,
    camera,
    size: { width, height },
  } = useThree()

  const ref = useUpdate(
    geometry => {
      const vector = geometry.vertices[0].clone()
      vector.project(camera)
      vector.x = ((vector.x + 1) / 2) * width
      vector.y = (-(vector.y - 1) / 2) * height
      console.log(vector)
    },
    [camera, width, height]
  )

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry ref={ref} attach="geometry" />
      <meshBasicMaterial attach="material" color="hotpink" />
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
