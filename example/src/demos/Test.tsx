import React, { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'

function Test() {
  const [vec, setVec] = useState<[number, number, number]>([1, 2, 3])
  const vecRef = useRef()
  useEffect(() => void setTimeout(() => setVec([4, 5, 6]), 1000), [])
  useEffect(() => void console.log('REF ->', vecRef.current), [vec])

  return <vector3 ref={vecRef} args={vec} />
}

export default function App() {
  return (
    <Canvas>
      <Test />
    </Canvas>
  )
}
