import { Canvas, type ThreeElements, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'

const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: 'red' }))
const group = new THREE.Group()
group.add(mesh)

function Box(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  useFrame((state) => {
    ref.current.position.y = Math.sin(state.clock.elapsedTime) / 3
  })

  return (
    <mesh
      ref={ref}
      onPointerOver={(e) => setHovered(true)}
      onPointerOut={(e) => setHovered(false)}
      onClick={() => setClicked(!clicked)}
      scale={clicked ? [1.5, 1.5, 1.5] : [1, 1, 1]}
      {...props}>
      <boxGeometry />
      <meshBasicMaterial color={hovered ? 'hotpink' : 'aquamarine'} />
    </mesh>
  )
}

function Box2(props: ThreeElements['group']) {
  return <primitive object={group} {...props} onClick={() => console.log('hi')} />
}

export default function App() {
  return (
    <Canvas>
      <group>
        <Box position={[-0.5, 0, 0]} />
      </group>
      <Box2 position={[0.5, 0, 0]} />
    </Canvas>
  )
}
