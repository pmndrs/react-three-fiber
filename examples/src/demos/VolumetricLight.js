import * as THREE from 'three'
import * as React from 'react'
import { Canvas, useThree, useFrame, extend } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import AdditiveBlendingShader from '../resources/shaders/AdditiveBlendingShader'
import VolumetricLightShader from '../resources/shaders/VolumetricLightShader'

extend({ EffectComposer, RenderPass, ShaderPass })

const shaderPassArgs1 = [VolumetricLightShader]
const shaderPassArgs2 = [AdditiveBlendingShader]
const shaderPassArgs3 = [FXAAShader]

const DEFAULT_LAYER = 0
const OCCLUSION_LAYER = 1
const position1 = [0, 0, 2]
const args1 = [0.8, 0.28, 150, 32]

function TorusKnot({ layer = DEFAULT_LAYER }) {
  const ref = React.useRef()
  const Material = `mesh${layer === DEFAULT_LAYER ? 'Physical' : 'Basic'}Material`
  useFrame(({ clock }) => {
    ref.current.position.x = Math.cos(clock.getElapsedTime()) * 1.5
    ref.current.rotation.x += 0.01
    ref.current.rotation.y += 0.01
    ref.current.rotation.z += 0.01
  })
  return (
    <mesh ref={ref} position={position1} layers={layer} receiveShadow castShadow>
      <torusKnotBufferGeometry attach="geometry" args={args1} />
      <Material
        attach="material"
        color={layer === DEFAULT_LAYER ? 'hotpink' : 'black'}
        roughness={1}
        clearcoat={1}
        clearcoatRoughness={0.2}
      />
    </mesh>
  )
}

const args2 = [1, 20, 1]

function VolumetricLightComponent() {
  const ref = React.useRef()
  useFrame(() => (ref.current.rotation.z += 0.005))
  return (
    <mesh ref={ref} layers={OCCLUSION_LAYER}>
      <boxBufferGeometry attach="geometry" args={args2} />
      <meshBasicMaterial attach="material" color="white" />
    </mesh>
  )
}

function Effects() {
  const { gl, scene, camera, size } = useThree()
  const occlusionRenderTarget = React.useMemo(() => new THREE.WebGLRenderTarget(), [])
  const occlusionComposer = React.useRef()
  const composer = React.useRef()

  React.useEffect(() => {
    occlusionComposer.current.setSize(size.width, size.height)
    composer.current.setSize(size.width, size.height)
  }, [size])

  useFrame(() => {
    camera.layers.set(OCCLUSION_LAYER)
    occlusionComposer.current.render()
    camera.layers.set(DEFAULT_LAYER)
    composer.current.render()
  }, 1)

  const effectComposerArgs = React.useMemo(() => [gl, occlusionRenderTarget], [gl, occlusionRenderTarget])
  const renderPassArgs = React.useMemo(() => [scene, camera], [scene, camera])
  const effectComposerArgs2 = React.useMemo(() => [gl], [gl])
  const materialUniformResolutionValue = React.useMemo(() => [1 / size.width, 1 / size.height], [size.width, size.height])

  return (
    <>
      <VolumetricLightComponent />
      <effectComposer ref={occlusionComposer} args={effectComposerArgs} renderToScreen={false}>
        <renderPass attachArray="passes" args={renderPassArgs} />
        <shaderPass attachArray="passes" args={shaderPassArgs1} needsSwap={false} />
      </effectComposer>
      <effectComposer ref={composer} args={effectComposerArgs2}>
        <renderPass attachArray="passes" args={renderPassArgs} />
        <shaderPass attachArray="passes" args={shaderPassArgs2} uniforms-tAdd-value={occlusionRenderTarget.texture} />
        <shaderPass
          attachArray="passes"
          args={shaderPassArgs3}
          material-uniforms-resolution-value={materialUniformResolutionValue}
          renderToScreen
        />
      </effectComposer>
    </>
  )
}

const style = { background: '#171720' }
const camera = { fov: 50, position: [0, 0, 7] }
const spotLightPosition = [10, 10, 10]

function VolumetricLight() {
  return (
    <Canvas style={style} shadowMap camera={camera}>
      <ambientLight />
      <pointLight intensity={4} />
      <spotLight
        castShadow
        intensity={1}
        angle={Math.PI / 10}
        position={spotLightPosition}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <TorusKnot />
      <TorusKnot layer={OCCLUSION_LAYER} />
      <Effects />
    </Canvas>
  )
}

export default React.memo(VolumetricLight)
