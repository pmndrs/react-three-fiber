import * as THREE from 'three'
import React, { useCallback, useState, useEffect, useRef } from 'react'
import { extend, Canvas, useFrame, useResource, useThree } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { WaterPass } from './../resources/postprocessing/WaterPass'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { GlitchPass } from './../resources/postprocessing/GlitchPass'

extend({ EffectComposer, ShaderPass, RenderPass, WaterPass, GlitchPass, AfterimagePass })

function Particle({ geometry, material, mouse }) {
  let ref = useRef()
  let t = Math.random() * 100
  let factor = 20 + Math.random() * 100
  let speed = 0.01 + Math.random() / 200
  let xFactor = -50 + Math.random() * 100
  let yFactor = -50 + Math.random() * 100
  let zFactor = -30 + Math.random() * 60
  useFrame(() => {
    t += speed
    const a = Math.cos(t) + Math.sin(t * 1) / 10
    const b = Math.sin(t) + Math.cos(t * 2) / 10
    const s = Math.cos(t)
    ref.current.position.set(
      (mouse.current[0] / 200) * a + xFactor + Math.cos((t / 30) * factor) + (Math.sin(t * 1) * factor) / 10,
      (-mouse.current[1] / 200) * b + yFactor + Math.sin((t / 20) * factor) + (Math.cos(t * 2) * factor) / 10,
      zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 20
    )
    ref.current.scale.set(s, s, s)
    ref.current.rotation.set(s * 5, s * 5, s * 5)
  })
  return <mesh ref={ref} material={material} geometry={geometry} />
}

function Swarm({ mouse }) {
  const light = useRef()
  const [geometryRef, geometry] = useResource()
  const [materialRef, material] = useResource()

  useFrame(() => {
    light.current.position.set(mouse.current[0] / 50, -mouse.current[1] / 50, 0)
  })
  return (
    <>
      <pointLight ref={light} distance={50} intensity={1.5} color="white" />
      <spotLight intensity={0.5} position={[10, 10, 40]} penumbra={1} />
      <mesh>
        <planeGeometry attach="geometry" args={[10000, 10000]} />
        <meshPhongMaterial attach="material" color="#575757" depthTest={false} />
      </mesh>

      <dodecahedronBufferGeometry ref={geometryRef} args={[0.8, 0]} />
      <meshPhysicalMaterial ref={materialRef} />
      {geometry &&
        new Array(2000)
          .fill()
          .map((_, index) => <Particle key={index} material={material} geometry={geometry} mouse={mouse} />)}
    </>
  )
}

function Effect() {
  const composer = useRef()
  const { scene, gl, size, camera } = useThree()
  useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  useFrame(({ gl }) => void ((gl.autoClear = true), composer.current.render()), 1)
  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <waterPass attachArray="passes" factor={2} />
      <afterimagePass attachArray="passes" uniforms-damp-value={0.7} />
      <shaderPass
        attachArray="passes"
        args={[FXAAShader]}
        material-uniforms-resolution-value={[1 / size.width, 1 / size.height]}
        renderToScreen
      />
    </effectComposer>
  )
}

export default function App() {
  const mouse = useRef([0, 0])
  const onMouseMove = useCallback(
    ({ clientX: x, clientY: y }) => (mouse.current = [x - window.innerWidth / 2, y - window.innerHeight / 2]),
    []
  )

  return (
    <div className="main" onMouseMove={onMouseMove}>
      <Canvas style={{ background: '#272727' }} camera={{ fov: 75, position: [0, 0, 50] }} manual>
        <Swarm mouse={mouse} />
        <Effect />
      </Canvas>
      <a href="https://github.com/drcmda/react-three-fiber" className="top-left" children="Github" />
      <a href="https://twitter.com/0xca0a" className="top-right" children="Twitter" />
      <a href="https://github.com/react-spring/react-spring" className="bottom-left" children="+ react-spring" />
      <div className="header-major">
        <span>LOREM</span>
      </div>
    </div>
  )
}
