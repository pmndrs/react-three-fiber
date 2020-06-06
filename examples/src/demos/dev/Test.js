import * as THREE from 'three'
import React, { Suspense } from 'react'
import { Canvas, useLoader, useThree } from 'react-three-fiber'

function M() {
  const t = useLoader(
    THREE.TextureLoader,
    `https://raw.githubusercontent.com/flowers1225/threejs-earth/master/src/img/earth4.jpg`
  )
  return (
    <>
      <mesh position={[-1, 0, 0]}>
        <boxBufferGeometry attach="geometry" />
        <meshBasicMaterial attach="material" color="hotpink" />
      </mesh>
      <mesh position={[1, 0, 0]}>
        <boxBufferGeometry attach="geometry" />
        <meshBasicMaterial attach="material" map={t} />
      </mesh>
    </>
  )
}

export default function App() {
  return (
    <Canvas colorManagement style={{ background: '#272730' }}>
      <Suspense fallback={null}>
        <M />
      </Suspense>
    </Canvas>
  )
}
