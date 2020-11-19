import React, { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from 'react-three-fiber'
import { OrbitControls } from 'drei'

function Thing() {
  const ref = useRef()

  useFrame((_, dt) => {
    console.log('This log line should only appear once per second!')
    ref.current.rotation.x = ref.current.rotation.y += dt
  })

  return (
    <mesh ref={ref}>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

function AwkwardTicker() {
  const { invalidate } = useThree()

  useEffect(() => {
    console.log('Registering interval')

    const id = setInterval(() => {
      //console.log('Invalidating frame')
      invalidate()
    }, 1000)

    return () => clearInterval(id)
  }, [invalidate])

  return null
}

export default function App() {
  return (
    <Canvas invalidateFrameloop>
      <AwkwardTicker />
      <Thing />
      <OrbitControls />
    </Canvas>
  )
}
