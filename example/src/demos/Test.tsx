import * as THREE from 'three'
import * as React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Hud } from '@react-three/drei'

function Box({ color = 'orange', ...props }) {
  const ref = React.useRef<THREE.Mesh>(null!)
  const [hovered, hover] = React.useState(false)
  const [clicked, click] = React.useState(false)
  useFrame((state, delta) => (ref.current.rotation.x += delta))
  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={() => click(!clicked)}
      onPointerOver={(event) => (event.stopPropagation(), hover(true))}
      onPointerOut={() => hover(false)}>
      <boxGeometry />
      <meshStandardMaterial color={hovered ? 'hotpink' : color} />
    </mesh>
  )
}

export default function App() {
  const [visible, set] = React.useState(true)
  React.useEffect(() => {
    setTimeout(() => set(false), 2000)
    setTimeout(() => set(true), 4000)
  }, [])
  return (
    <Canvas>
      <ambientLight intensity={Math.PI / 2} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <Box position={[-1.2, 0, 0]} />
      <Hud>
        <ambientLight intensity={Math.PI / 2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        {visible && <Box color="skyblue" position={[1.2, 0, 0]} />}
      </Hud>
      <OrbitControls />
    </Canvas>
  )
}
