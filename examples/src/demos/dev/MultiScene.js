import * as React from 'react'
import { Canvas, useFrame, useThree, useResource } from 'react-three-fiber'

const args1 = [1, 64, 64]

function Content() {
  const { camera } = useThree()
  const scene = React.useRef()
  useFrame(({ gl }) => void ((gl.autoClear = true), gl.render(scene.current, camera)), 10)
  return (
    <scene ref={scene}>
      <mesh>
        <sphereBufferGeometry attach="geometry" args={args1} />
        <meshBasicMaterial attach="material" color="white" />
      </mesh>
    </scene>
  )
}

const args2 = [0.5, 64, 64]

function HeadsUpDisplay() {
  const { camera } = useThree()
  const scene = React.useRef()
  useFrame(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene.current, camera)), 100)
  return (
    <scene ref={scene}>
      <mesh>
        <sphereBufferGeometry attach="geometry" args={args2} />
        <meshBasicMaterial attach="material" color="black" />
      </mesh>
    </scene>
  )
}

const position = [0, 0, 2.5]

function onUpdate(self) {
  self.updateProjectionMatrix()
}

function Main() {
  const { size, setDefaultCamera } = useThree()
  const ref = useResource()

  // #15929 (https://github.com/mrdoob/three.js/issues/15929)
  // The camera needs to be updated every frame
  // We give this frame a priority so that automatic rendering will be switched off right away
  useFrame(() => ref.current.updateMatrixWorld())
  React.useLayoutEffect(() => void setDefaultCamera(ref.current), [ref, setDefaultCamera])

  return (
    <>
      <perspectiveCamera
        ref={ref}
        aspect={size.width / size.height}
        radius={(size.width + size.height) / 4}
        fov={100}
        position={position}
        onUpdate={onUpdate}
      />
      <Content />
      <HeadsUpDisplay />
    </>
  )
}

const style = { background: '#272727' }

function MultiScene() {
  return (
    <Canvas style={style} invalidateFrameloop dispose={null}>
      <Main />
    </Canvas>
  )
}

export default React.memo(MultiScene)
