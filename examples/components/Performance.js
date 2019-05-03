import * as THREE from 'three'
import React, { useRef, useEffect } from 'react'
import { apply, Canvas, useRender, useThree } from 'react-three-fiber'
import { useSprings, a } from 'react-spring/three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
apply({ OrbitControls })

const count = 400
const root = Math.sqrt(count)
const array = new Array(count).fill()
const material = new THREE.MeshNormalMaterial()
const geometry = new THREE.BoxBufferGeometry(20, 20, 20)
console.log('number', count * Math.floor(root))

function Rectangle({ position }) {
  const ref = useRef()
  useRender(() => (ref.current.rotation.z += 0.05))
  return (
    <mesh ref={ref} position={position}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function Plane({ z }) {
  return (
    <group>
      {array.map((_, index) => (
        <Rectangle
          key={index}
          position={[
            (root / 2.15 - Math.floor(index / root)) * 100,
            (root / 2.15 - Math.floor(index % root)) * 100,
            z * 100,
          ]}
        />
      ))}
    </group>
  )
}

function Content() {
  return (
    <group>
      {new Array(Math.floor(root)).fill().map((_, index) => (
        <Plane key={index} z={index} />
      ))}
    </group>
  )
}

export default function App() {
  return (
    <div class="main" style={{ color: '#172717' }}>
      <Canvas style={{ background: '#A2CCB6' }} orthographic camera={{ position: [0, 0, 1000], far: 10000 }}>
        {({ camera }) => (
          <>
            <orbitControls args={[camera]} />
            <ambientLight intensity={0.5} />
            <spotLight intensity={0.5} position={[300, 300, 4000]} />
            <Content />
          </>
        )}
      </Canvas>
    </div>
  )
}
