import * as THREE from 'three'
import React, { useMemo, useCallback, useState } from 'react'
import { Canvas, useThree } from 'react-three-fiber'
import { useSpring, animated as a } from 'react-spring/three'
import useGesture from 'react-use-gesture'
import { add, scale } from 'vec-la'

function Icosahedron({ position, rotation }) {
  const [hovered, setHover] = useState(false)
  const [{ xy, size }, set] = useSpring(() => ({ xy: [0, 0], size: 1 }))
  const bind = useGesture({
    onAction: ({ event, down, active, local, ...rest }) => {
      console.log(down, active, rest)
      // active means the element is hovered in this situation
      if (active) {
        console.log('hover')
        // element is hovered
      } else {
        console.log('unhover')
        // element is unhovered
      }
      event.stopPropagation()
      set({ xy: local })
    },
    // todo: fix state.transform.x, my fault ...
    events: 'drag',
  })
  //const hover = useCallback(e => void (e.stopPropagation(), set({ size: 1.2 })), [])
  //const unhover = useCallback(() => set({ size: 1 }), [])
  return (
    <a.mesh
      {...bind()}
      position={xy.interpolate((x, y) => [x + position[0], y + position[1], position[2]])}
      rotation={rotation}
      scale={size.interpolate(s => [s, s, s])}>
      <icosahedronGeometry name="geometry" args={[5, 0]} />
      <meshNormalMaterial name="material" />
    </a.mesh>
  )
}

export default function App() {
  const count = 300
  const col = 20
  const items = new Array(count)
    .fill()
    .map((_, i) => [
      [(i % col) * 9 - col * 4.5, Math.floor(i / col) * 9 - (count / col) * 4.5, 50 - Math.random() * 100],
      [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
    ])
  return (
    <Canvas className="canvas" camera={{ position: [0, 0, 70], fov: 80 }} invalidateFrameloop>
      {items.map(([position, rotation], index) => (
        <Icosahedron key={index} position={position} rotation={rotation} />
      ))}
    </Canvas>
  )
}
