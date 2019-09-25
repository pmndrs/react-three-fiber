import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react'
import { extend, Canvas, useFrame, useThree, useResource } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { WaterPass } from './../resources/postprocessing/WaterPass'
extend({ OrbitControls, EffectComposer, ShaderPass, RenderPass, WaterPass })

function Main() {
  const [sceneRef, scene] = useResource()
  const composer = useRef()
  const { gl, size, camera } = useThree()

  useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  useFrame(({ gl }) => void ((gl.autoClear = true), composer.current.render()), 1)

  return (
    <scene ref={sceneRef}>
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
    </scene>
  )
}

function Hud() {
  const scene = useRef()
  const { camera } = useThree()
  useFrame(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene.current, camera)), 10)
  const [hovered, set] = useState(false)
  const hover = useCallback(() => set(true), [])
  const unhover = useCallback(() => set(false), [])
  return (
    <scene ref={scene}>
      <mesh onPointerOver={hover} onPointerOut={unhover}>
        <sphereBufferGeometry attach="geometry" args={[0.5, 64, 64]} />
        <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'black'} />
      </mesh>
    </scene>
  )
}

function Content() {
  const { size, setDefaultCamera } = useThree()
  const camera = useRef()
  const controls = useRef()

  useEffect(() => void setDefaultCamera(camera.current), [])
  useFrame(() => {
    if (controls.current) controls.current.update()
    if (camera.current) camera.current.updateMatrixWorld()
  }, 1000)

  return (
    <>
      <perspectiveCamera
        ref={camera}
        aspect={size.width / size.height}
        radius={(size.width + size.height) / 4}
        fov={55}
        position={[0, 0, 5]}
        onUpdate={self => self.updateProjectionMatrix()}
      />
      {camera.current && (
        <group>
          <orbitControls ref={controls} args={[camera.current]} enableDamping dampingFactor={0.1} rotateSpeed={0.1} />
          <Main />
          <Hud />
        </group>
      )}
    </>
  )
}

export default function App() {
  return (
    <Canvas style={{ background: '#272727' }}>
      <Content />
    </Canvas>
  )
}
