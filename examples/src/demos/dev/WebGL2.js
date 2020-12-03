import { WebGLMultisampleRenderTarget as MSRT, RGBFormat } from 'three'
import React, { useEffect, useRef, useMemo } from 'react'
import { Canvas, extend, useThree, useFrame } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader'
import { WEBGL } from 'three/examples/jsm/WebGL'

extend({ EffectComposer, ShaderPass, RenderPass })

function Dodecahedron() {
  const ref = useRef()
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
  const composer = useRef()
  const renderTarget = useMemo(() => {
    const target = new MSRT(width, height, { format: RGBFormat, stencilBuffer: false })
    target.samples = 8
    return target
  }, [width, height])
  useEffect(() => void composer.current.setSize(width, height), [width, height])
  useFrame(() => composer.current.render(), 1)
  return (
    <effectComposer ref={composer} args={[gl, renderTarget]}>
      <renderPass attachArray="passes" args={[scene, camera]} />
      <shaderPass attachArray="passes" args={CopyShader} />
    </effectComposer>
  )
}

export default function App() {
  return WEBGL.isWebGL2Available() === false ? (
    <h1
      style={{
        fontSize: '8em',
        color: 'black',
        left: '50%',
        top: '50%',
        lineHeight: '0.8em',
        transform: 'translate3d(-50%,-50%,0)',
      }}
    >
      sorry,
      <br />
      no webgl2
    </h1>
  ) : (
    <Canvas style={{ background: 'lightblue' }}>
      <color attach="background" args={['lightblue']} />
      <Dodecahedron />
      <Effects />
    </Canvas>
  )
}
