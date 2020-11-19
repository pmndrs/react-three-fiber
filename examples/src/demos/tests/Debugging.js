import React, { useMemo, useState } from 'react'
import { Canvas } from 'react-three-fiber'
import { BoxBufferGeometry, Mesh, MeshBasicMaterial } from 'three'

function TestComponent() {
  const [enabled, setEnabled] = useState(true)

  const mesh = useMemo(() => {
    const geom = new BoxBufferGeometry()
    const mat = new MeshBasicMaterial({ color: 'rgb(200, 120, 120)' })
    return new Mesh(geom, mat)
  }, [])

  if (enabled) {
    return (
      <primitive object={mesh} onPointerOver={(ev) => console.log('over')} onClick={(ev) => setEnabled(!enabled)} />
    )
  } else {
    return null
  }
}

export default function App() {
  return (
    <Canvas>
      <ambientLight />
      <TestComponent />
    </Canvas>
  )
}
