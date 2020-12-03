import * as THREE from 'three'
import React, { useEffect, useRef, useMemo } from 'react'
import { Canvas, useThree, useFrame, extend } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import AdditiveBlendingShader from '../resources/shaders/AdditiveBlendingShader'
import VolumetricLightShader from '../resources/shaders/VolumetricLightShader'

extend({ EffectComposer, RenderPass, ShaderPass })

const DEFAULT_LAYER = 0
const OCCLUSION_LAYER = 1

function Torusknot({ layer = DEFAULT_LAYER }) {
  const ref = useRef()
  const Material = `mesh${layer === DEFAULT_LAYER ? 'Physical' : 'Basic'}Material`
  useFrame(({ clock }) => {
    ref.current.position.x = Math.cos(clock.getElapsedTime()) * 1.5
    ref.current.rotation.x += 0.01
    ref.current.rotation.y += 0.01
    ref.current.rotation.z += 0.01
  })
  return (
    <mesh ref={ref} position={[0, 0, 2]} layers={layer} receiveShadow castShadow>
      <torusKnotBufferGeometry attach="geometry" args={[0.8, 0.28, 150, 32]} />
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

function VolumetricLight() {
  const ref = useRef()
  useFrame(() => (ref.current.rotation.z += 0.005))
  return (
    <mesh ref={ref} layers={OCCLUSION_LAYER}>
      <boxBufferGeometry attach="geometry" args={[1, 20, 1]} />
      <meshBasicMaterial attach="material" color="white" />
    </mesh>
  )
}

function Effects() {
  const { gl, scene, camera, size } = useThree()
  const occlusionRenderTarget = useMemo(() => new THREE.WebGLRenderTarget(), [])
  const occlusionComposer = useRef()
  const composer = useRef()

  useEffect(() => {
    occlusionComposer.current.setSize(size.width, size.height)
    composer.current.setSize(size.width, size.height)
  }, [size])

  useFrame(() => {
    camera.layers.set(OCCLUSION_LAYER)
    occlusionComposer.current.render()
    camera.layers.set(DEFAULT_LAYER)
    composer.current.render()
  }, 1)

  return (
    <>
      <VolumetricLight />
      <effectComposer ref={occlusionComposer} args={[gl, occlusionRenderTarget]} renderToScreen={false}>
        <renderPass attachArray="passes" args={[scene, camera]} />
        <shaderPass attachArray="passes" args={[VolumetricLightShader]} needsSwap={false} />
      </effectComposer>
      <effectComposer ref={composer} args={[gl]}>
        <renderPass attachArray="passes" args={[scene, camera]} />
        <shaderPass
          attachArray="passes"
          args={[AdditiveBlendingShader]}
          uniforms-tAdd-value={occlusionRenderTarget.texture}
        />
        <shaderPass
          attachArray="passes"
          args={[FXAAShader]}
          material-uniforms-resolution-value={[1 / size.width, 1 / size.height]}
          renderToScreen
        />
      </effectComposer>
    </>
  )
}

export default function App() {
  return (
    <Canvas style={{ background: '#171720' }} shadowMap camera={{ fov: 50, position: [0, 0, 7] }}>
      <ambientLight />
      <pointLight intensity={4} />
      <spotLight
        castShadow
        intensity={1}
        angle={Math.PI / 10}
        position={[10, 10, 10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Torusknot />
      <Torusknot layer={OCCLUSION_LAYER} />
      <Effects />
    </Canvas>
  )
}
