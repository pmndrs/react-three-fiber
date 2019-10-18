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
  const [ratio] = useState(() => 0.5 + 0.5 * Math.random())
  const [width] = useState(() => Math.max(0.1, 0.3 * Math.random()))
  // Calculate wiggly curve
  const [curve] = useState(() => {
    let pos = new THREE.Vector3(30 - 60 * Math.random(), -5, 10 - 20 * Math.random())
    const points = new Array(30)
      .fill()
      .map(() =>
        pos.add(new THREE.Vector3(2 - Math.random() * 4, 4 - Math.random() * 2, 5 - Math.random() * 10)).clone()
      )
    return new THREE.CatmullRomCurve3(points).getPoints(500)
  })
  // Hook into the render loop and decrease the materials dash-offset
  useFrame(() => (material.current.uniforms.dashOffset.value -= 0.0005))
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
        dashArray={0.1}
        dashRatio={ratio}
      />
    </mesh>
  )
}

function Scene() {
  let group = useRef()
  let theta = 0
  // Hook into the render loop and rotate the scene a bit
  useFrame(() => group.current.rotation.set(0, 5 * Math.sin(THREE.Math.degToRad((theta += 0.02))), 0))
  return (
    <group ref={group}>
      {lines.map((_, index) => (
        <Fatline key={index} />
      ))}
    </group>
  )
}

export default function App() {
  return (
    <Canvas style={{ background: '#324444' }} camera={{ position: [0, 50, 10], fov: 75 }}>
      <Scene />
    </Canvas>
  )
}
