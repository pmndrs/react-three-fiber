import React, { useRef, useState, useLayoutEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

function Content() {
  const camera = useThree((state) => state.camera)
  const scene = useRef<THREE.Scene>(null!)
  useFrame(({ gl }) => void ((gl.autoClear = true), gl.render(scene.current, camera)), 10)
  return (
    <scene ref={scene}>
      <mesh>
        <sphereBufferGeometry attach="geometry" args={[1, 64, 64]} />
        <meshBasicMaterial attach="material" color="white" />
      </mesh>
    </scene>
  )
}

function HeadsUpDisplay() {
  const camera = useThree((state) => state.camera)
  const scene = useRef<THREE.Scene>(null!)
  useFrame(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene.current, camera)), 100)
  return (
    <scene ref={scene}>
      <mesh>
        <sphereBufferGeometry attach="geometry" args={[0.5, 64, 64]} />
        <meshBasicMaterial attach="material" color="black" />
      </mesh>
    </scene>
  )
}

function Main() {
  const { size, set } = useThree()
  const [ref, setRef] = useState<THREE.PerspectiveCamera>(null!)

  // #15929 (https://github.com/mrdoob/three.js/issues/15929)
  // The camera needs to be updated every frame
  // We give this frame a priority so that automatic rendering will be switched off right away
  useFrame(() => ref.updateMatrixWorld())
  useLayoutEffect(() => void set({ camera: ref }), [ref, set])

  return (
    <>
      <perspectiveCamera
        ref={setRef}
        aspect={size.width / size.height}
        fov={100}
        position={[0, 0, 2.5]}
        onUpdate={(self) => self.updateProjectionMatrix()}
      />
      <Content />
      <HeadsUpDisplay />
    </>
  )
}

export default function App() {
  return (
    <Canvas style={{ background: '#272727' }} frameloop="demand">
      <Main />
    </Canvas>
  )
}
