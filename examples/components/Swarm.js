import * as THREE from 'three'
import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import { extend, Canvas, useFrame, useResource, useThree } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { WaterPass } from './../resources/postprocessing/WaterPass'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

extend({ EffectComposer, ShaderPass, RenderPass, WaterPass, AfterimagePass, UnrealBloomPass })

function Swarm({ count, mouse }) {
  const ref = useRef()
  const light = useRef()
  const { size, viewport } = useThree()
  const aspect = size.width / viewport.width / 1

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100
      const factor = 20 + Math.random() * 100
      const speed = 0.01 + Math.random() / 200
      const xFactor = -50 + Math.random() * 100
      const yFactor = -50 + Math.random() * 100
      const zFactor = -50 + Math.random() * 100
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 })
    }
    return temp
  }, [count])

  useFrame(state => {
    light.current.position.set(mouse.current[0] / aspect, -mouse.current[1] / aspect, 0)
    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle
      t = particle.t += speed / 2
      const a = Math.cos(t) + Math.sin(t * 1) / 10
      const b = Math.sin(t) + Math.cos(t * 2) / 10
      const s = Math.cos(t)

      particle.mx += (mouse.current[0] - particle.mx) * 0.01
      particle.my += (mouse.current[1] * -1 - particle.my) * 0.01

      dummy.position.set(
        (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      )
      dummy.scale.set(s, s, s)
      dummy.rotation.set(s * 5, s * 5, s * 5)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <pointLight distance={40} intensity={8} ref={light}>
        <mesh>
          <sphereBufferGeometry attach="geometry" args={[3, 32, 32]} />
          <meshBasicMaterial attach="material" color="white" />
        </mesh>
      </pointLight>
      <instancedMesh ref={ref} args={[null, null, count]}>
        <dodecahedronBufferGeometry attach="geometry" args={[1, 0]} />
        <meshStandardMaterial attach="material" color="#760026" />
      </instancedMesh>
    </>
  )
}

function Effect() {
  const composer = useRef()
  const { scene, gl, size, camera } = useThree()
  const aspect = useMemo(() => new THREE.Vector2(size.width, size.height), [size])
  useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  useFrame(({ gl }) => void ((gl.autoClear = true), composer.current.render()), 1)
  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <waterPass attachArray="passes" factor={2} />
      <afterimagePass attachArray="passes" uniforms-damp-value={0.3} />
      <unrealBloomPass attachArray="passes" args={[aspect, 1, 1, 0]} />
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
    <div style={{ width: '100%', height: '100%' }} onMouseMove={onMouseMove}>
      <Canvas
        style={{ background: '#272727' }}
        camera={{ fov: 75, position: [0, 0, 70] }}
        onCreated={({ gl }) => (window.gl = gl)}>
        <pointLight distance={60} intensity={2} color="white" />
        <spotLight intensity={0.5} position={[0, 0, 70]} penumbra={1} />
        <mesh>
          <planeGeometry attach="geometry" args={[10000, 10000]} />
          <meshPhongMaterial attach="material" color="#373737" depthTest={false} />
        </mesh>
        <Swarm mouse={mouse} count={20000} />
        <Effect />
      </Canvas>
    </div>
  )
}
