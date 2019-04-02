import * as THREE from 'three'
import React, { useMemo, useCallback, useState } from 'react'
import { Canvas, useThree } from 'react-three-fiber'
import { useSpring, a } from 'react-spring/three'
import useGesture from 'react-use-gesture'
import { add, scale } from 'vec-la'

const count = 300
const col = 20
const items = new Array(count)
  .fill()
  .map((_, i) => [
    [(i % col) * 8 - col * 4, Math.floor(i / col) * 8 - (count / col) * 4, 50 - Math.random() * 100],
    [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
  ])

function Icosahedron({ position, rotation }) {
  const [{ xy, size }, set] = useSpring(() => ({ xy: [0, 0], size: 1 }))
  const bind = useGesture({
    onDrag: ({ event, local }) => void (event.stopPropagation(), set({ xy: local })),
    onHover: ({ event, active }) => void (event.stopPropagation(), set({ size: active ? 1.2 : 1 })),
    onWheel: ({ event, velocity }) => void (event.stopPropagation(), set({ size: Math.max(1, velocity * 3) })),
  })
  return (
    <a.mesh
      {...bind()}
      position={xy.interpolate((x, y) => [x + position[0], y + position[1], position[2]])}
      rotation={rotation}
      scale={size.interpolate(s => [s, s, s])}>
      <icosahedronGeometry attach="geometry" args={[5, 0]} />
      <meshNormalMaterial attach="material" />
    </a.mesh>
  )
}

export default function App() {
  return (
    <Canvas className="canvas" camera={{ position: [0, 0, 70], fov: 80 }} invalidateFrameloop>
      {items.map(([position, rotation], index) => (
        <Icosahedron key={index} position={position} rotation={rotation} />
      ))}
    </Canvas>
  )
}
