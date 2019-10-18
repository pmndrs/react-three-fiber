import * as THREE from 'three'
import React, { useState, useRef } from 'react'
import { extend, Canvas, useFrame } from 'react-three-fiber'
import * as meshline from 'threejs-meshline'

extend(meshline)

const numLines = 50
const lines = new Array(numLines).fill()
const colors = ['#A2CCB6', '#FCEEB5', '#EE786E', '#EE786E']

function Fatline() {
  const material = useRef()
  const [color] = useState(() => colors[parseInt(colors.length * Math.random())])
  const [width] = useState(() => Math.max(0.1, 0.4 * Math.random()))
  const [speed] = useState(() => Math.max(0.0001, 0.0005 * Math.random()))
  // Calculate wiggly curve
  const [curve] = useState(() => {
    let pos = new THREE.Vector3(4 - Math.random() * 8, 10 - Math.random() * 20, 3 - Math.random() * 6)
    let points = new Array(20)
      .fill()
      .map(() =>
        pos.add(new THREE.Vector3(4 - Math.random() * 8, 10 - Math.random() * 20, 3 - Math.random() * 6)).clone()
      )
    return new THREE.CatmullRomCurve3(points).getPoints(500)
  })
  // Hook into the render loop and decrease the materials dash-offset
  useFrame(() => (material.current.uniforms.dashOffset.value -= speed))
  return (
    <mesh>
      <meshLine attach="geometry" vertices={curve} />
      <meshLineMaterial
        attach="material"
        ref={material}
        transparent
        depthTest={false}
        lineWidth={width}
        color={color}
        dashArray={0.05}
        dashRatio={0.7}
      />
    </mesh>
  )
}

function Lines() {
  const ref = useRef()
  useFrame(({ clock }) => {
    ref.current.rotation.x = Math.cos(clock.getElapsedTime() / 10) * Math.PI
    ref.current.rotation.y = Math.sin(clock.getElapsedTime() / 10) * Math.PI
    ref.current.rotation.z = Math.cos(clock.getElapsedTime() / 10) * Math.PI
  })
  return (
    <group ref={ref}>
      {lines.map((_, index) => (
        <Fatline key={index} />
      ))}
    </group>
  )
}

export default function App() {
  return (
    <Canvas style={{ background: '#324444' }} camera={{ position: [0, 0, 10], fov: 50 }}>
      <Lines />
    </Canvas>
  )
}
