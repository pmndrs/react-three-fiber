import React, { useState, useEffect, useCallback } from 'react'
import { Canvas, createPortal } from '@react-three/fiber'

function Icosahedron() {
  const [active, set] = useState(false)
  const handleClick = useCallback((e) => set((state) => !state), [])
  return (
    <mesh scale={active ? [2, 2, 2] : [1, 1, 1]} onClick={handleClick}>
      <icosahedronGeometry args={[1, 0]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function RenderToPortal({ targets }: any) {
  const [target, set] = useState(targets[0])
  useEffect(() => void setTimeout(() => set(targets[1]), 500), [targets])
  return (
    <>
      <mesh position={[-2, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshNormalMaterial />
      </mesh>
      {createPortal(<Icosahedron />, target)}
    </>
  )
}

export default function Group() {
  const [ref1, set1] = useState()
  const [ref2, set2] = useState()
  return (
    <Canvas onCreated={() => console.log('onCreated')}>
      <group>
        <group ref={set1} position={[0, 0, 0]} />
        <group ref={set2} position={[2, 0, 0]} />
        {ref1 && ref2 && <RenderToPortal targets={[ref1, ref2]} />}
      </group>
    </Canvas>
  )
}
