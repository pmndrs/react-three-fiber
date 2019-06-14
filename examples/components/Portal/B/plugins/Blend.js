import React, { useRef, useState, useEffect } from 'react'
import { useRender } from 'react-three-fiber'
import { useStore, useView } from './../store'

export default function Blend({ id }) {
  // Connect to the plugins own state
  const self = useStore(state => state.plugins[id])
  // Manage some internal state (a color) and switch it after 2s
  const [color, set] = useState('lightblue')
  useEffect(() => void setTimeout(() => set('hotpink'), 2000), [])

  // Opt into drawing into the canvas
  useView(() => {
    const ref = useRef()
    useRender(() => (ref.current.rotation.y += 0.1))
    return (
      <mesh position={[-2, 0, 0]} ref={ref} onClick={console.log}>
        <meshStandardMaterial attach="material" color={color} />
        <octahedronGeometry attach="geometry" />
      </mesh>
    )
  }, [color])

  // Draw the plugins UI
  return (
    <div style={{ padding: 10, width: 150, background: color }}>
      {self.name} {color}
    </div>
  )
}

Blend.description = {
  name: 'Blend',
  version: '1.0.0',
  author: 'Paul Henschel',
  persistent: false,
}
