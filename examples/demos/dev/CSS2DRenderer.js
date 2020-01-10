import React from 'react'
import { Canvas, useThree, useFrame } from 'react-three-fiber'
import { render } from '../../../src/targets/css2d'

function Labels() {
  const { camera, scene } = useThree()
  return null
}

export default function() {
  return (
    <Canvas style={{ background: '#272730' }}>
      <mesh>
        <sphereBufferGeometry attach="geometry" />
      </mesh>
    </Canvas>
  )
}
