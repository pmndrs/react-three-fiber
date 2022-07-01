import React, { SyntheticEvent, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { a, useSpring } from '@react-spring/three'
import { OrbitControls } from '@react-three/drei'

export default function Box() {
  const [active, setActive] = useState(0)
  const [activeBg, setActiveBg] = useState(0)
  // create a common spring that will be used later to interpolate other values
  const { spring } = useSpring({
    spring: active,
    config: { mass: 5, tension: 400, friction: 50, precision: 0.0001 },
  })
  // interpolate values from commong spring
  const scale = spring.to([0, 1], [1, 2])
  const rotation = spring.to([0, 1], [0, Math.PI])
  const color = active ? spring.to([0, 1], ['#6246ea', '#e45858']) : spring.to([0, 1], ['#620000', '#e40000'])
  const bgColor = activeBg ? 'lightgreen' : 'lightgray'
  const preventDragDropDefaults = {
    onDrop: (e: SyntheticEvent) => e.preventDefault(),
    onDragEnter: (e: SyntheticEvent) => e.preventDefault(),
    onDragOver: (e: SyntheticEvent) => e.preventDefault(),
  }
  return (
    <Canvas
      {...preventDragDropDefaults}
      onDropMissed={(e) => {
        console.log('drop missed!')
        setActiveBg(0)
      }}
      onDragOverMissed={(e) => setActiveBg(1)}
      onDragLeave={() => setActiveBg(0)}>
      <color attach="background" args={[bgColor]} />
      <a.mesh
        rotation-y={rotation}
        scale-x={scale}
        scale-z={scale}
        onDrop={(e) => {
          console.log('dropped!')
          setActive(0)
        }}
        onDragOverEnter={() => {
          setActive(1)
          setActiveBg(0)
        }}
        onDragOverLeave={() => setActive(0)}>
        <boxBufferGeometry />
        <a.meshBasicMaterial color={color} />
      </a.mesh>
      <OrbitControls />
    </Canvas>
  )
}
