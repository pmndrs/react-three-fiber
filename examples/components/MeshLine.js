import * as THREE from 'three'
import React, { useState, useRef } from 'react'
import { apply, Canvas, useRender } from 'react-three-fiber'
import * as meshline from 'three.meshline'

apply(meshline)

const numLines = 100
const lines = new Array(numLines).fill()
const colors = ['#A2CCB6', '#FCEEB5', '#EE786E', '#EE786E']

function Fatline() {
  const material = useRef()
  const [color] = useState(() => colors[parseInt(colors.length * Math.random())])
  const [ratio] = useState(() => 0.5 + 0.5 * Math.random())
  const [width] = useState(() => Math.max(0.1, 0.3 * Math.random()))
  const [curve] = useState(() => {
    let points = []
    let pos = new THREE.Vector3(30 - 60 * Math.random(), -5, 10 - 20 * Math.random())
    for (let i = 0; i < 30; i++) {
      pos.add(new THREE.Vector3(2 - Math.random() * 4, 4 - Math.random() * 2, 5 - Math.random() * 10))
      points.push(pos.clone())
    }
    return new THREE.CatmullRomCurve3(points).getPoints(500)
  })

  useRender(() => (material.current.uniforms.dashOffset.value -= 0.0005))
  return (
    <mesh>
      <meshLine onUpdate={self => (self.parent.geometry = self.geometry)}>
        <geometry vertices={curve} onUpdate={self => self.parent.setGeometry(self)} />
      </meshLine>
      <meshLineMaterial
        ref={material}
        attach="material"
        transparent
        depthTest={false}
        lineWidth={width}
        dashArray={0.1}
        color={color}
        dashOffset={0.0}
        dashRatio={ratio}
      />
    </mesh>
  )
}

function Scene() {
  let group = useRef()
  let theta = 0
  useRender(() => group.current.rotation.set(0, 5 * Math.sin(THREE.Math.degToRad((theta += 0.02))), 0))
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
    <div class="main">
      <Canvas style={{ background: '#324444' }} camera={{ position: [0, 50, 10], fov: 75 }}>
        <Scene />
      </Canvas>
      <a href="https://github.com/drcmda/react-three-fiber" class="top-left" children="Github" />
      <a href="https://twitter.com/0xca0a" class="top-right" children="Twitter" />
      <a
        href="https://codepen.io/machida_yosuke/pen/aPjRjq"
        class="bottom-right"
        children="Original / Machida Yosuke"
      />
      <span class="header">React Three Fiber</span>
    </div>
  )
}
