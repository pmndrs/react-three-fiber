import * as THREE from 'three'
import * as React from 'react'
import { Canvas, createPortal, extend, useFrame, useThree } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { WaterPass } from '../../resources/postprocessing/WaterPass'

extend({ OrbitControls, EffectComposer, ShaderPass, RenderPass, WaterPass })

const shaderPassArgs = [FXAAShader]
const spotLightPosition = [100, 10, 10]
const boxBufferGeometryArgs = [2, 2, 2]
const sphereBufferGeometryArgs = [0.5, 64, 64]

function Main() {
  const [scene] = React.useState(() => new THREE.Scene())
  const composer = React.useRef()
  const { gl, size, camera } = useThree()

  React.useEffect(() => void composer.current.setSize(size.width, size.height), [size.width, size.height])

  useFrame(({ gl }) => void ((gl.autoClear = true), composer.current.render()), 1)

  const effectComposerArgs = React.useMemo( () => [gl], [gl])

  const materialUniformResolutionValue = React.useMemo(() => [1 / size.width, 1 / size.height], [size.height, size.width])

  const portal = React.useMemo(() => {
    return (
      <>
        <renderPass attachArray="passes" scene={scene} camera={camera} />
        <waterPass attachArray="passes" factor={2} />
        <shaderPass
          attachArray="passes"
          args={shaderPassArgs}
          material-uniforms-resolution-value={materialUniformResolutionValue}
          renderToScreen
        />
      </>
    )
  }, [scene, camera, materialUniformResolutionValue])

  return createPortal(
    <>
      <effectComposer ref={composer} args={effectComposerArgs}>
        {scene && portal}
      </effectComposer>
      <ambientLight />
      <spotLight position={spotLightPosition} />
      <mesh>
        <boxBufferGeometry attach="geometry" args={boxBufferGeometryArgs} />
        <meshStandardMaterial attach="material" color="lightgreen" />
      </mesh>
    </>,
    scene
  )
}

function HudComponent() {
  const [scene] = React.useState(() => new THREE.Scene())
  const { camera } = useThree()
  useFrame(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene, camera)), 10)
  const [hovered, set] = React.useState(false)
  const onPointerOver = React.useCallback(function callback() {
    set(true)
  }, [])
  const onPointerOut = React.useCallback(function callback() {
    set(false)
  }, [])
  return createPortal(
    <mesh onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <sphereBufferGeometry attach="geometry" args={sphereBufferGeometryArgs} />
      <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'black'} />
    </mesh>,
    scene
  )
}

const target = [0, 0, 0]

const Controls = () => {
  const { camera, gl } = useThree()
  const ref = React.useRef()
  useFrame(() => ref.current.update())
  const args = React.useMemo(() => [camera, gl.domElement], [camera, gl.domElement])
  return <orbitControls ref={ref} target={target} enableDamping args={args} />
}

function Content() {
  const { size, setDefaultCamera } = useThree()

  const [camera] = React.useState(() => {
    const cam = new THREE.PerspectiveCamera(55, size.width / size.height)
    cam.position.set(0, 0, 5)
    setDefaultCamera(cam)
    return cam
  })

  // Isn't useEffect is better in this case?
  React.useMemo(() => (camera.aspect = size.width / size.height), [camera, size.width, size.height])

  useFrame(() => camera.updateMatrixWorld())
  return (
    <group>
      <Controls />
      <Main />
      <HudComponent />
    </group>
  )
}

const style = { background: '#171720' }

function Hud() {
  return (
    <Canvas style={style}>
      <Content />
    </Canvas>
  )
}

export default React.memo(Hud)
