import * as THREE from 'three'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Canvas, createPortal, extend, useFrame, useThree } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { WaterPass } from '../../resources/postprocessing/WaterPass'

extend({ OrbitControls, EffectComposer, ShaderPass, RenderPass, WaterPass })

function Main() {
  const [scene] = useState(() => new THREE.Scene())
  const composer = useRef()
  const { gl, size, camera } = useThree()
  useEffect(() => void composer.current.setSize(size.width, size.height), [size.width, size.height])
  useFrame(({ gl }) => void ((gl.autoClear = true), composer.current.render()), 1)
  return createPortal(
    <>
      <effectComposer ref={composer} args={[gl]}>
        {scene && (
          <>
            <renderPass attachArray="passes" scene={scene} camera={camera} />
            <waterPass attachArray="passes" factor={2} />
            <shaderPass
              attachArray="passes"
              args={[FXAAShader]}
              material-uniforms-resolution-value={[1 / size.width, 1 / size.height]}
              renderToScreen
            />
          </>
        )}
      </effectComposer>
      <ambientLight />
      <spotLight position={[100, 10, 10]} />
      <mesh>
        <boxBufferGeometry attach="geometry" args={[2, 2, 2]} />
        <meshStandardMaterial attach="material" color="lightgreen" />
      </mesh>
    </>,
    scene
  )
}

function Hud() {
  const [scene] = useState(() => new THREE.Scene())
  const { camera } = useThree()
  useFrame(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene, camera)), 10)
  const [hovered, set] = useState(false)
  return createPortal(
    <mesh onPointerOver={() => set(true)} onPointerOut={() => set(false)}>
      <sphereBufferGeometry attach="geometry" args={[0.5, 64, 64]} />
      <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'black'} />
    </mesh>,
    scene
  )
}

const Controls = () => {
  const { camera, gl } = useThree()
  const ref = useRef()
  useFrame(() => ref.current.update())
  return <orbitControls ref={ref} target={[0, 0, 0]} enableDamping args={[camera, gl.domElement]} />
}

function Content() {
  const { size, setDefaultCamera } = useThree()
  const [camera] = useState(() => {
    const cam = new THREE.PerspectiveCamera(55, size.width / size.height)
    cam.position.set(0, 0, 5)
    setDefaultCamera(cam)
    return cam
  })
  useMemo(() => (camera.aspect = size.width / size.height), [camera.aspect, size.width, size.height])
  useFrame(() => camera.updateMatrixWorld())
  return (
    <group>
      <Controls />
      <Main />
      <Hud />
    </group>
  )
}

export default function App() {
  return (
    <Canvas style={{ background: '#171720' }}>
      <Content />
    </Canvas>
  )
}
