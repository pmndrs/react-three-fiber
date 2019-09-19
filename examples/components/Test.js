import * as THREE from 'three'
import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useThree, useUpdate } from 'react-three-fiber'

function Forward({ el: El, children, ...props }) {
  const [_, forceUpdate] = useState(false)
  const ref = useRef()
  useEffect(() => void forceUpdate(i => !i), [ref.current])
  return <El ref={ref} {...props} children={ref.current && children(ref.current)} />
}

export default function App() {
  return (
    <Canvas camera={{ layers: 1 }}>
      <mesh layers={1}>
        <sphereBufferGeometry attach="geometry" args={[1, 32, 32]} />
      </mesh>
    </Canvas>
  )
}
