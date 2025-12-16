import { Canvas, createPortal } from '@react-three/fiber'
import { useCallback, useEffect, useReducer, useState } from 'react'
import * as THREE from 'three'

function Icosahedron() {
  const [active, setActive] = useState(false)
  const handleClick = useCallback(() => setActive((state) => !state), [])
  return (
    <mesh scale={active ? [2, 2, 2] : [1, 1, 1]} onClick={handleClick}>
      <icosahedronGeometry args={[1, 0]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function RenderToPortal({ targets }: { targets: THREE.Group[] }) {
  const [target, toggle] = useReducer((state) => (state + 1) % targets.length, 0)

  useEffect(() => {
    const interval = setInterval(toggle, 1000)
    return () => clearInterval(interval)
  }, [targets])

  return <>{createPortal(<Icosahedron />, targets[target])}</>
}

export default function Group() {
  const [ref1, set1] = useState<THREE.Group>(null!)
  const [ref2, set2] = useState<THREE.Group>(null!)

  return (
    <Canvas onCreated={() => console.log('onCreated')}>
      <group>
        <group ref={set1 as any} position={[-2, 0, 0]} />
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshNormalMaterial />
        </mesh>
        <group ref={set2 as any} position={[2, 0, 0]} />
        {ref1 && ref2 && <RenderToPortal targets={[ref1, ref2]} />}
      </group>
    </Canvas>
  )
}
