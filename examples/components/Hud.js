import * as THREE from 'three'
import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react'
import { useSpring, animated } from 'react-spring/three'
import { apply, Canvas, useRender, useThree } from 'react-three-fiber'
import { OrbitControls } from '../resources/controls/OrbitControls'
import { EffectComposer } from './../resources/postprocessing/EffectComposer'
import { RenderPass } from './../resources/postprocessing/RenderPass'
import { GlitchPass } from './../resources/postprocessing/GlitchPass'
import { ShaderPass } from './../resources/postprocessing/ShaderPass'
apply({ OrbitControls, EffectComposer, RenderPass, GlitchPass })

function Main() {
  const scene = useRef()
  const camera = useContext(cameraContext)

  const composer = useRef()
  const { gl, size } = useThree()
  useEffect(() => void composer.current.obj.setSize(size.width, size.height), [size])
  useRender(({ gl }) => {
    gl.autoClear = true
    composer.current.obj.render()
  }, true)

  return (
    <scene ref={scene}>
      <effectComposer ref={composer} args={[gl]}>
        {scene.current && (
          <>
            <renderPass name="passes" args={[scene.current, camera]} />
            <glitchPass name="passes" factor={1} renderToScreen />
          </>
        )}
      </effectComposer>
      <ambientLight />
      <spotLight position={[100, 10, 10]} />
      <mesh>
        <boxBufferGeometry name="geometry" args={[2, 2, 2]} />
        <meshStandardMaterial name="material" color="green" />
      </mesh>
    </scene>
  )
}

function Hud() {
  const camera = useContext(cameraContext)
  const scene = useRef()
  useRender(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene.current, camera)))
  const [hovered, set] = useState(false)
  const hover = useCallback(() => set(true), [])
  const unhover = useCallback(() => set(false), [])
  return (
    <scene ref={scene}>
      <mesh onHover={hover} onUnhover={unhover}>
        <sphereBufferGeometry name="geometry" args={[0.5, 64, 64]} />
        <meshBasicMaterial name="material" color={hovered ? 'hotpink' : 'black'} />
      </mesh>
    </scene>
  )
}

const cameraContext = React.createContext()
function Content() {
  const { size, setDefaultCamera } = useThree()
  const [camera] = useState(() => {
    const camera = new THREE.PerspectiveCamera()
    camera.position.z = 5
    setDefaultCamera(camera)
    return camera
  })
  useMemo(() => {
    camera.aspect = size.width / size.height
    camera.radius = (size.width + size.height) / 4
    camera.updateProjectionMatrix()
  }, [size])
  const controls = useRef()
  useRender(() => controls.current.obj.update())
  return (
    <cameraContext.Provider value={camera}>
      <orbitControls ref={controls} args={[camera]} enableDamping dampingFactor={0.1} rotateSpeed={0.1} />
      <Main />
      <Hud />
    </cameraContext.Provider>
  )
}

export default function App() {
  return (
    <Canvas style={{ background: '#272727' }}>
      <Content />
    </Canvas>
  )
}
