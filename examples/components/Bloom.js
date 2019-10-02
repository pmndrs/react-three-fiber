import * as THREE from 'three'
import React, { useState, useMemo, useEffect } from 'react'
import { Canvas, useThree, useFrame } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'

function Sphere({ geometry, x, y, z, s }) {
  const [active, set] = useState(false)
  return (
    <mesh
      onPointerOver={() => set(true)}
      onPointerOut={() => set(false)}
      position={[x, y, z]}
      scale={[s, s, s]}
      geometry={geometry}
      userData={{ active }}>
      <meshStandardMaterial attach="material" color="hotpink" roughness={1} />
    </mesh>
  )
}

function Spheres() {
  const [geometry] = useState(() => new THREE.IcosahedronBufferGeometry(1, 4), [])
  const data = useMemo(() => {
    return new Array(50).fill().map((_, i) => ({
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      z: Math.random() * 100 - 50,
      s: Math.random() + 10,
    }))
  }, [])
  return data.map((props, i) => <Sphere key={i} {...props} geometry={geometry} />)
}

const materials = {}
const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' })
const darkenNonBloomed = obj =>
  obj.isMesh && !obj.userData.active && ((materials[obj.uuid] = obj.material), (obj.material = darkMaterial))
const restoreMaterial = obj => materials[obj.uuid] && ((obj.material = materials[obj.uuid]), delete materials[obj.uuid])
function Effect() {
  const { gl, scene, camera, size } = useThree()

  const [bloom, final] = useMemo(() => {
    const renderScene = new RenderPass(scene, camera)

    const comp = new EffectComposer(gl)
    comp.renderToScreen = false
    comp.addPass(renderScene)
    comp.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 1, 1.5, 0))

    const finalComposer = new EffectComposer(gl)
    finalComposer.addPass(renderScene)
    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: { baseTexture: { value: null }, bloomTexture: { value: comp.renderTarget2.texture } },
        vertexShader:
          'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
        fragmentShader:
          'uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; vec4 getTexture( sampler2D texelToLinearTexture ) { return mapTexelToLinear( texture2D( texelToLinearTexture , vUv ) ); } void main() { gl_FragColor = ( getTexture( baseTexture ) + vec4( 1.0 ) * getTexture( bloomTexture ) ); }',
      }),
      'baseTexture'
    )
    finalPass.needsSwap = true
    finalComposer.addPass(finalPass)

    const fxaa = new ShaderPass(FXAAShader)
    fxaa.material.uniforms['resolution'].value.x = 1 / size.width
    fxaa.material.uniforms['resolution'].value.y = 1 / size.height
    finalComposer.addPass(fxaa)

    return [comp, finalComposer]
  }, [])

  useEffect(() => {
    bloom.setSize(size.width, size.height)
    final.setSize(size.width, size.height)
  }, [bloom, final, size])

  useFrame(() => {
    // https://github.com/mrdoob/three.js/blob/master/examples/webgl_postprocessing_unreal_bloom_selective.html
    // this seems kinda dirty, it mutates the scene and overwrites materials
    scene.traverse(darkenNonBloomed)
    bloom.render()
    scene.traverse(restoreMaterial)
    // then writes the normal scene on top
    final.render()
  }, 1)
  return null
}

export default () => (
  <Canvas gl={{ toneMapping: THREE.Uncharted2ToneMapping }} camera={{ position: [0, 0, 100] }}>
    <pointLight />
    <ambientLight />
    <Spheres />
    <Effect />
  </Canvas>
)
