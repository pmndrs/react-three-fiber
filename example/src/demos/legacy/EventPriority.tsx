import { Canvas, createPortal } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewcube, useGLTF, PerspectiveCamera } from '@react-three/drei'
import { Hud } from './components/Hud'
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
  const { scene } = useGLTF('/models/Duck.glb')

  return (
    <Canvas>
      <ambientLight intensity={Math.PI / 2} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <Hud renderPriority={5}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            console.log('Hud Click!', e)
          }}>
          <meshBasicMaterial color="midnightblue" />
          <ringGeometry />
        </mesh>
      </Hud>
      <primitive
        object={scene}
        onClick={(e) => {
          e.stopPropagation()
          console.log('Duck Click!', e)
        }}
      />
      <mesh
        name="box"
        onClick={(e) => {
          e.stopPropagation()
          console.log('Box Click!', e)
        }}>
        <boxGeometry />
        <meshBasicMaterial color="red" />
      </mesh>
      <OrbitControls makeDefault />
      <GizmoHelper alignment={'center-center'}>
        <GizmoViewcube />
      </GizmoHelper>
      <GizmoHelper alignment={'bottom-left'} renderPriority={2}>
        <GizmoViewcube />
      </GizmoHelper>
    </Canvas>
  )
}

/*

      */
