import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

// --- Projection Functions ---
function project4Dto3D(v4, d = 3) {
  const epsilon = 1e-6
  if (Math.abs(v4.w - d) < epsilon) {
    return new THREE.Vector3(0, 0, 0)
  }
  const factor = d / (d - v4.w)
  return new THREE.Vector3(v4.x * factor, v4.y * factor, v4.z * factor)
}

// --- Tesseract Wireframe Component ---
function Tesseract() {
  const vertices4D = []
  for (let x of [-1, 1]) {
    for (let y of [-1, 1]) {
      for (let z of [-1, 1]) {
        for (let w of [-1, 1]) {
          vertices4D.push(new THREE.Vector4(x, y, z, w))
        }
      }
    }
  }

  const edges = []
  const n = vertices4D.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let diff = 0
      for (let k = 0; k < 4; k++) {
        if (Math.abs(vertices4D[i].getComponent(k) - vertices4D[j].getComponent(k)) > 0.001) {
          diff++
        }
      }
      if (diff === 1) {
        edges.push([vertices4D[i], vertices4D[j]])
      }
    }
  }

  const lines = edges.map(([v1, v2], idx) => {
    const p1 = project4Dto3D(v1, 3)
    const p2 = project4Dto3D(v2, 3)
    return (
      <Line
        key={idx}
        points={[p1.toArray(), p2.toArray()]}
        color="gray"
        lineWidth={1}
      />
    )
  })

  return <group>{lines}</group>
}

// --- Bouncing Ball Component ---
function BouncingBall() {
  const ballRef = useRef()
  const ballState = useRef({
    pos: new THREE.Vector4(
      (Math.random() - 0.5),
      (Math.random() - 0.5),
      (Math.random() - 0.5),
      (Math.random() - 0.5)
    ),
    vel: new THREE.Vector4(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    )
  })

  useFrame((state, delta) => {
    let newPos = ballState.current.pos.clone().add(ballState.current.vel.clone().multiplyScalar(delta))
    let newVel = ballState.current.vel.clone()

    for (let i = 0; i < 4; i++) {
      if (newPos.getComponent(i) >= 1) {
        newPos.setComponent(i, 1)
        newVel.setComponent(i, -newVel.getComponent(i))
      } else if (newPos.getComponent(i) <= -1) {
        newPos.setComponent(i, -1)
        newVel.setComponent(i, -newVel.getComponent(i))
      }
    }
    ballState.current.pos = newPos
    ballState.current.vel = newVel

    const projected = project4Dto3D(newPos, 3)
    if (ballRef.current) {
      ballRef.current.position.copy(projected)
    }
  })

  return (
    <mesh ref={ballRef}>
      <sphereBufferGeometry args={[0.08, 32, 32]} />
      <meshStandardMaterial color="hotpink" emissive="pink" />
    </mesh>
  )
}

// --- Narrative Overlay Component ---
function NarrativeOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        width: '100%',
        textAlign: 'center',
        fontSize: '24px',
        color: 'white',
        textShadow: '0 0 8px black'
      }}
    >
      The ball whispers secrets of higher dimensions...
    </div>
  )
}

// --- The 3D Scene ---
function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <Tesseract />
      <BouncingBall />
    </>
  )
}

// --- Main App Component ---
export default function App() {
  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        style={{ width: '100vw', height: '100vh', background: '#101030' }}
      >
        <Scene />
      </Canvas>
      <NarrativeOverlay />
    </>
  )
}
