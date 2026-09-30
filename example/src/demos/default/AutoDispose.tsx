import { Canvas, type ThreeElements, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'

// Spread props are typed for the element they land on: a mesh's props are not a group's.
type BoxProps = {
  setActive: (active: boolean) => void
  active: boolean
}

function Box1({ setActive, active, ...props }: BoxProps & ThreeElements['mesh']) {
  const mesh = useRef<THREE.Mesh>(null!)
  const [hovered, setHover] = useState(false)
  useFrame((state) => (mesh.current.position.y = Math.sin(state.elapsed)))

  return (
    <mesh
      {...props}
      ref={mesh}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}>
      <boxGeometry />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

function Box2({ setActive, active, ...props }: BoxProps & ThreeElements['group']) {
  const mesh = useRef<THREE.Mesh>(null!)
  const [hovered, setHover] = useState(false)
  useFrame((state) => (mesh.current.position.y = Math.sin(state.elapsed)))

  return (
    <group {...props}>
      <mesh
        ref={mesh}
        onClick={() => setActive(!active)}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}>
        <boxGeometry />
        <meshStandardMaterial color={hovered ? 'green' : 'blue'} />
      </mesh>
    </group>
  )
}

function Switcher() {
  const [active, setActive] = useState(false)

  return (
    <>
      {active && <Box1 active={active} setActive={setActive} position={[-0.5, 0, 0]} />}
      {!active && <Box2 active={active} setActive={setActive} position={[0.25, 0, 0]} />}
    </>
  )
}

export default function App() {
  return (
    <Canvas renderer orthographic camera={{ zoom: 100 }}>
      <ambientLight intensity={Math.PI} />
      <Switcher />
    </Canvas>
  )
}
