import React, { useRef } from 'react'
import { useRender } from 'react-three-fiber'
import { useStore } from '../store'

function Main({ id }) {
  const self = useStore(state => state.plugins[id])
  return <div style={{ padding: 10, width: 150, background: 'black' }}>{self.name}</div>
}

function View({ id }) {
  const self = useStore(state => state.plugins[id])
  const ref = useRef()
  useRender(() => (ref.current.rotation.y += 0.1))
  return (
    <mesh ref={ref} position={[2, 0, 0]}>
      <meshStandardMaterial attach="material" color="hotpink" />
      <octahedronGeometry attach="geometry" />
    </mesh>
  )
}

const description = {
  name: 'Blend',
  version: '1.0.0',
  author: 'Paul Henschel',
  persistent: false,
}

export { Layout, View, description }
