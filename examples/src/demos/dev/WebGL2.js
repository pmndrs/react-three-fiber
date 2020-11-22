import { WebGLMultisampleRenderTarget, RGBFormat } from 'three'
import * as React from 'react'
import { Canvas, extend, useThree, useFrame } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader'
import { WEBGL } from 'three/examples/jsm/WebGL'

extend({ EffectComposer, ShaderPass, RenderPass })

function Dodecahedron() {
  const ref = React.useRef()
  useFrame(() => (ref.current.rotation.x = ref.current.rotation.y = ref.current.rotation.z += 0.01))
  return (
    <mesh ref={ref}>
      <dodecahedronBufferGeometry attach="geometry" />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

function Effects() {
  const { gl, scene, camera, size } = useThree()
  const { width, height } = size
  const composer = React.useRef()
  const renderTarget = React.useMemo(() => {
    const target = new WebGLMultisampleRenderTarget(width, height, { format: RGBFormat, stencilBuffer: false })
    target.samples = 8
    return target
  }, [width, height])
  React.useEffect(() => void composer.current.setSize(width, height), [width, height])
  useFrame(() => composer.current.render(), 1)

  const effectComposerArgs = React.useMemo(() => [gl, renderTarget], [gl, renderTarget])
  const renderPassArgs = React.useMemo(() => [scene, camera], [scene, camera])

  return (
    <effectComposer ref={composer} args={effectComposerArgs}>
      <renderPass attachArray="passes" args={renderPassArgs} />
      <shaderPass attachArray="passes" args={CopyShader} />
    </effectComposer>
  )
}

const h1style = {
  fontSize: '8em',
  color: 'black',
  left: '50%',
  top: '50%',
  lineHeight: '0.8em',
  transform: 'translate3d(-50%,-50%,0)',
}

const canvasStyle = { background: 'lightblue' }
const colorArgs = ['lightblue']

function WebGL2() {
  return WEBGL.isWebGL2Available() === false ? (
    <h1 style={h1style}>
      sorry,
      <br />
      no webgl2
    </h1>
  ) : (
    <Canvas style={canvasStyle}>
      <color attach="background" args={colorArgs} />
      <Dodecahedron />
      <Effects />
    </Canvas>
  )
}

export default React.memo(WebGL2)
