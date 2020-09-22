import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { extend, useThree, useFrame } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader'
import { WaterPass } from './shaders/WaterPass'
import state from '../state'

extend({ EffectComposer, ShaderPass, RenderPass, WaterPass })

export default function Effects() {
  const composer = useRef()
  const water = useRef()
  const { gl, size, camera, scene } = useThree()
  useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  let last = state.top
  let index = 0
  let values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  useFrame(() => {
    const { top } = state
    values[index] = Math.abs(top - last)
    const normalize = values.reduce((a, b) => a + b) / values.length
    water.current.factor = THREE.MathUtils.lerp(water.current.factor, normalize / 30, 0.1)
    last = top
    index = (index + 1) % 10
    gl.autoClear = true
    composer.current.render()
  }, 1)
  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <waterPass attachArray="passes" ref={water} />
      <shaderPass attachArray="passes" args={[GammaCorrectionShader]} />
    </effectComposer>
  )
}
