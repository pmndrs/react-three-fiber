import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useDrag } from '@use-gesture/react'
import { useRef, useState } from 'react'
import type * as THREE from 'three'

function Object({ scale = 1, z = 0, opacity = 1 }) {
  const { viewport } = useThree()
  const [hovered, hover] = useState(false)
  const [position, set] = useState<[number, number, number]>([0, 0, z])
  const bind = useDrag(({ event, offset: [x, y] }) => {
    event.stopPropagation()
    const aspect = viewport.getCurrentViewport().factor
    set([x / aspect, -y / aspect, z])
  })

  const mesh = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    mesh.current!.rotation.x = mesh.current!.rotation.y += 0.01
  })

  return (
    <mesh
      ref={mesh}
      position={position}
      {...(bind() as any)}
      onPointerOver={(e) => {
        e.stopPropagation()
        hover(true)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        hover(false)
      }}
      onClick={(e) => {
        e.stopPropagation()
        console.log('clicked', { z })
      }}
      castShadow
      scale={scale}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial transparent opacity={opacity} color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <ambientLight intensity={0.5 * Math.PI} />
      <spotLight decay={0} position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight decay={0} position={[-10, -10, -10]} />
      <Object z={-1} scale={0.5} />
      <Object opacity={0.8} />
    </Canvas>
  )
}
