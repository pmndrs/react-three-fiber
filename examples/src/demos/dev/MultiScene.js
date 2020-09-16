import React, { useRef, useLayoutEffect } from 'react'
import { Canvas, useFrame, useThree, useResource } from 'react-three-fiber'

function Content() {
  const { camera } = useThree()
  //console.log(camera)
  const scene = useRef()
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
  const { camera } = useThree()
  const scene = useRef()
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
  const { size, setDefaultCamera } = useThree()
  const ref = useResource()

  // #15929 (https://github.com/mrdoob/three.js/issues/15929)
  // The camera needs to be updated every frame
  // We give this frame a priority so that automatic rendering will be switched off right away
  useFrame(() => ref.current.updateMatrixWorld())
  useLayoutEffect(() => void setDefaultCamera(ref.current), [ref, setDefaultCamera])

  return (
    <>
      <perspectiveCamera
        ref={ref}
        aspect={size.width / size.height}
        radius={(size.width + size.height) / 4}
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
    <Canvas style={{ background: '#272727' }} invalidateFrameloop>
      <Main />
    </Canvas>
  )
}
