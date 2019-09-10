import React, { useRef, useEffect, useState, useCallback, useContext, useMemo } from 'react'
import { apply, Canvas, useThree, useFrame } from 'react-three-fiber'
import create from 'zustand'

const numberOfItems = 100
const ids = new Array(numberOfItems).fill().map((_, i) => i)
const [useStore, api] = create(set => ({
  // each box carries a unique id
  boxes: ids,
  // each box carries rotation coordinates
  coords: ids.reduce(
    (acc, id) => ({
      ...acc,
      [id]: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
    }),
    0
  ),
  // the turn() function increases x/y/z rotation of each box by 0.01 radian
  // it mutate ALL boxes, so this will also affect all connected components which will quickly escalate
  turn(state) {
    set(state => {
      const result = { ...state }
      for (let i = 0; i < state.boxes.length; i++) {
        const id = state.boxes[i]
        const [x, y, z] = state.coords[id]
        result.coords[id] = [x + 0.01, y + 0.01, z + 0.01]
      }
      return result
    })
  },
}))

function BoxA({ id }) {
  // bad: it hooks the component to the store, re-rendering it on every change
  // it's fine for changes that happen rarely, but for often changing data this will choke
  const coords = useStore(state => state.coords[id], [id])
  return (
    <mesh rotation={coords}>
      <boxBufferGeometry args={[2, 2, 2]} attach="geometry" />
      <meshBasicMaterial attach="material" transparent opacity={0.2} />
    </mesh>
  )
}

function BoxB({ id }) {
  const mesh = useRef()
  const coords = useRef([0, 0, 0])
  // subscribe directly to the store, this allows us to be fully connected without
  // having to re-render, we offload data to a reference
  useEffect(() => api.subscribe(state => (coords.current = state.coords[id])), [])
  // we update the component transiently
  useFrame(() => mesh.current.rotation.set(...coords.current))
  return (
    <mesh ref={mesh}>
      <boxBufferGeometry args={[2, 2, 2]} attach="geometry" />
      <meshBasicMaterial attach="material" transparent opacity={0.2} />
    </mesh>
  )
}

export default function App() {
  // fetch boxes ...
  const boxes = useStore(state => state.boxes)

  useEffect(() => {
    function move() {
      api.getState().turn()
      requestAnimationFrame(move)
    }
    // mutate the store coordinates on every frame
    move()
  }, [])

  return (
    <Canvas>
      {boxes.map(id => (
        <BoxB key={id} id={id} />
      ))}
    </Canvas>
  )
}
