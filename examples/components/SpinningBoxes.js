import React, { useRef, useEffect, useState, useCallback, useContext, useMemo } from 'react'
import { apply, Canvas, useThree, useFrame } from 'react-three-fiber'
import * as Scheduler from 'scheduler'

const numberOfItems = 1000
const ids = new Array(numberOfItems).fill().map((_, i) => i)

function BoxA({ coords }) {
  return (
    <mesh rotation={coords}>
      <boxBufferGeometry args={[2, 2, 2]} attach="geometry" />
      <meshBasicMaterial attach="material" transparent opacity={0.2} />
    </mesh>
  )
}

export default function App() {
  const [boxes, set] = useState(() =>
    ids.reduce(
      (acc, id) => ({
        ...acc,
        [id]: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
      }),
      0
    )
  )

  useEffect(() => {
    function move() {
      Scheduler.unstable_next(() => {
        set(state => {
          const result = { ...state }
          for (let id = 0; id < ids.length; id++) {
            const [x, y, z] = state[id]
            result[id] = [x + 0.01, y + 0.01, z + 0.01]
          }
          return result
        })
      })
      requestAnimationFrame(move)
    }
    move()
  }, [])

  return (
    <Canvas>
      {ids.map(id => (
        <BoxA key={id} coords={boxes[id]} />
      ))}
    </Canvas>
  )
}
