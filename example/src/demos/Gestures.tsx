import React, { useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useDrag } from 'react-use-gesture'

function Obj() {
  const { viewport } = useThree()
  const [position, set] = useState<[number, number, number]>([0, 0, 0])
  const bind = useDrag(({ offset: [x, y], vxvy: [vx, vy], down, ...props }) => {
    const aspect = viewport.getCurrentViewport().factor
    set([x / aspect, -y / aspect, 0])
  })

  return (
    <mesh position={position} {...(bind() as any)} castShadow>
      <dodecahedronGeometry args={[1.4, 0]} />
      <meshNormalMaterial />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas style={{ background: 'lightblue' }} shadows camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <spotLight
        intensity={0.6}
        position={[20, 10, 10]}
        angle={0.2}
        penumbra={1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        castShadow
      />
      <mesh receiveShadow>
        <planeBufferGeometry args={[1000, 1000]} />
        <meshPhongMaterial color="#272727" />
      </mesh>
      <Obj />
    </Canvas>
  )
}
