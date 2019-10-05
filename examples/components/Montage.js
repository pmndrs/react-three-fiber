import * as THREE from 'three'
import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react'
import { extend, Canvas, useFrame, useThree } from 'react-three-fiber'
import { useSprings, a } from 'react-spring/three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { WaterPass } from './../resources/postprocessing/WaterPass'
extend({ EffectComposer, ShaderPass, RenderPass, WaterPass })

const number = 30
const colors = ['#A2CCB6', '#FCEEB5', '#EE786E', '#e0feff']
const shapes = ['planeBufferGeometry', 'planeBufferGeometry', 'planeBufferGeometry']
const random = () => {
  const r = Math.random()
  return {
    position: [30 - Math.random() * 60, 30 - Math.random() * 60, 0],
    color: colors[Math.round(Math.random() * (colors.length - 1))],
    scale: [1 + r * 10, 1 + r * 10, 1],
    rotation: [0, 0, THREE.Math.degToRad(Math.round(Math.random()) * 45)],
  }
}

const data = new Array(number).fill().map(() => {
  const shape = shapes[Math.round(Math.random() * (shapes.length - 1))]
  return {
    shape,
    color: colors[Math.round(Math.random() * (colors.length - 1))],
    args: [0.1 + Math.random() * 9, 0.1 + Math.random() * 9],
  }
})

function Content() {
  const [springs, set] = useSprings(number, i => ({
    from: random(),
    ...random(),
    config: { mass: 20, tension: 500, friction: 200 },
  }))
  useEffect(() => void setInterval(() => set(i => ({ ...random(), delay: i * 50 })), 3000), [])
  return data.map((d, index) => (
    <a.mesh key={index} {...springs[index]}>
      <planeBufferGeometry attach="geometry" args={d.args} />
      <a.meshPhongMaterial attach="material" color={springs[index].color} />
    </a.mesh>
  ))
}

function Effect() {
  const composer = useRef()
  const { scene, gl, size, camera } = useThree()
  console.log(size)
  useEffect(() => console.log(size) || void composer.current.setSize(size.width, size.height), [size])
  useFrame(({ gl }) => void ((gl.autoClear = true), composer.current.render()), 1)

  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <waterPass attachArray="passes" factor={2} />
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
  return (
    <Canvas style={{ background: '#A2CCB6' }} camera={{ position: [0, 0, 30] }}>
      <ambientLight intensity={0.5} />
      <spotLight intensity={0.5} position={[300, 300, 4000]} />
      <Effect />
      <Content />
    </Canvas>
  )
}
