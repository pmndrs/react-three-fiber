import * as THREE from 'three'
import React, { useState, useRef } from 'react'
import { extend, Canvas, useFrame } from 'react-three-fiber'
import * as meshline from 'three.meshline'

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
    return new Array(20)
      .fill()
      .map(() =>
        pos.add(new THREE.Vector3(4 - Math.random() * 8, 10 - Math.random() * 20, 3 - Math.random() * 6)).clone()
      )
  })
  // Hook into the render loop and decrease the materials dash-offset
  useFrame(() => (material.current.uniforms.dashOffset.value -= speed))
  return (
    <mesh>
      {/** MeshLine and CMRCurve are a OOP factories, not scene objects, hence all the imperative code in here :-( */}
      <meshLine onUpdate={self => (self.parent.geometry = self.geometry)}>
        <geometry onUpdate={self => self.parent.setGeometry(self)}>
          <catmullRomCurve3 args={[curve]} onUpdate={self => (self.parent.vertices = self.getPoints(500))} />
        </geometry>
      </meshLine>
      {/** MeshLineMaterial on the other hand is a regular material, so we can just attach it */}
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
