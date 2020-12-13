import React, { useState } from 'react'
import { Canvas } from 'react-three-fiber'

function Box(props) {
  return (
    <mesh name={props.name} {...props}>
      <boxBufferGeometry />
      <meshBasicMaterial color="hotpink" />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <group
        onPointerOver={(e) => {
          e.stopPropagation()
          console.log('in', e.object.name)
        }}
        onPointerOut={(e) => {
          console.log(
            '  out',
            e.object.name,
            'hits',
            e.intersections.map((i) => i.object.name)
          )
        }}
      >
        <Box name="A" position={[-1, 0, -1]} />
        <Box name="B" position={[0, 0, 0]} />
        <Box name="C" position={[1, 0, 1]} />
      </group>
    </Canvas>
  )
}
