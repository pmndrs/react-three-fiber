import React from 'react'
import { Canvas, useThree } from 'react-three-fiber'
import { useDrag } from 'react-use-gesture'
import { useSpring, a } from 'react-spring/three'

function Obj() {
  const { size, viewport } = useThree()
  const aspect = size.width / viewport.width
  const [spring, set] = useSpring(() => ({ position: [0, 0, 0], config: { mass: 4, friction: 50, tension: 1500 } }))
  const bind = useDrag(({ offset: [x, y] }) => set({ position: [x / aspect, -y / aspect, 0] }), { pointerEvents: true })

  return (
    <a.mesh {...spring} {...bind()}>
      <dodecahedronBufferGeometry attach="geometry" />
      <meshNormalMaterial attach="material" />
    </a.mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <Obj />
    </Canvas>
  )
}
