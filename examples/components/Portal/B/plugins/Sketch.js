import React, { useRef, useState, useEffect } from 'react'
import { useRender } from 'react-three-fiber'
import { useStore, useView } from './../store'

export default function Sketch({ id }) {
  const self = useStore(state => state.plugins[id])
  const [color, set] = useState('lightgreen')
  useEffect(() => void setTimeout(() => set('goldenrod'), 2000), [])
  useView(() => {
    const ref = useRef()
    useRender(() => (ref.current.rotation.x += 0.1))
    return (
      <mesh position={[2, 0, 0]} ref={ref} onClick={console.log}>
        <meshStandardMaterial attach="material" color={color} />
        <octahedronGeometry attach="geometry" />
      </mesh>
    )
  }, [color])
  return (
    <div style={{ padding: 10, width: 150, background: color }}>
      {self.name} {color}
    </div>
  )
}

Sketch.description = {
  name: 'Sketch',
  version: '1.0.0',
  author: 'Ledas',
  persistent: false,
}
