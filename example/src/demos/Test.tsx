import * as THREE from 'three'
import React, { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'

const redMaterial = new THREE.MeshBasicMaterial({ color: 'red' })

function ReuseMaterial(props: any) {
  return (
    <mesh {...props}>
      <boxGeometry />
      <primitive attach="material" object={redMaterial} />
    </mesh>
  )
}

function TestReuse() {
  const [i, set] = useState(true)
  useEffect(() => void setInterval(() => set((s) => !s), 1000), [])
  return (
    <>
      {i && <ReuseMaterial position={[-1, 0, 0]} />}
      <ReuseMaterial position={[1, 0, 0]} />
    </>
  )
}

function TestMultiMaterial() {
  const ref = useRef<THREE.Mesh>(null!)
  const [ok, set] = useState(true)
  useEffect(() => {
    setInterval(() => set((ok) => !ok), 1000)
  }, [])
  useEffect(() => {
    console.log(ref.current.material)
  }, [ok])
  return (
    <mesh ref={ref}>
      <boxGeometry />
      <meshBasicMaterial attachArray="material" color="red" />
      <meshBasicMaterial attachArray="material" color="green" />
      <meshBasicMaterial attachArray="material" color="blue" />
      <meshBasicMaterial attachArray="material" color="pink" />
      {ok ? (
        <meshBasicMaterial attachArray="material" color="aquamarine" />
      ) : (
        <meshNormalMaterial attachArray="material" />
      )}
      <meshBasicMaterial attachArray="material" color="lavender" />
    </mesh>
  )
}

export default function Test() {
  return (
    <Canvas camera={{ position: [2, 2, 2] }}>
      <TestMultiMaterial />
      <TestReuse />
    </Canvas>
  )
}
