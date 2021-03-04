import * as THREE from 'three'
import React, { useEffect, useState, useRef } from 'react'
import { render } from 'react-three-fiber'

export default function App() {
  const [a] = useState(
    () => new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color('red') }))
  )

  const [b] = useState(
    () =>
      new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color('green') }))
  )

  const [index, set] = useState(0)
  const interval = useRef()
  useEffect(() => {
    interval.current = setInterval(() => set((i) => (i + 1) % 2), 1000)

    return () => {
      clearInterval(interval.current)
    }
  }, [])

  render(<primitive object={index === 0 ? a : b} />, document.getElementById('canvas'))

  return null
}
