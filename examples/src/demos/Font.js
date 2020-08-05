import * as THREE from 'three'
import React, { Suspense, useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useLoader, useFrame, useUpdate } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import flamingo from '../resources/gltf/flamingo.glb'
import parrot from '../resources/gltf/parrot.glb'
import stork from '../resources/gltf/stork.glb'
import bold from '../resources/fonts/bold.blob'

const birds = [flamingo, parrot, stork]

function Text({ children, vAlign = 'center', hAlign = 'center', size = 1, color = '#000000', ...props }) {
  const font = useLoader(THREE.FontLoader, bold)
  const config = useMemo(
    () => ({
      font,
      size: 40,
      height: 30,
      curveSegments: 32,
      bevelEnabled: true,
      bevelThickness: 6,
      bevelSize: 2.5,
      bevelOffset: 0,
      bevelSegments: 8,
    }),
    [font]
  )
  const mesh = useUpdate(
    (self) => {
      const size = new THREE.Vector3()
      self.geometry.computeBoundingBox()
      self.geometry.boundingBox.getSize(size)
      self.position.x = hAlign === 'center' ? -size.x / 2 : hAlign === 'right' ? 0 : -size.x
      self.position.y = vAlign === 'center' ? -size.y / 2 : vAlign === 'top' ? 0 : -size.y
    },
    [children]
  )
  return (
    <group {...props} scale={[0.1 * size, 0.1 * size, 0.1]}>
      <mesh ref={mesh}>
        <textGeometry attach="geometry" args={[children, config]} />
        <meshNormalMaterial attach="material" />
      </mesh>
    </group>
  )
}

function Jumbo() {
  const ref = useRef()
  useFrame(
    ({ clock }) =>
      (ref.current.rotation.x = ref.current.rotation.y = ref.current.rotation.z =
        Math.sin(clock.getElapsedTime()) * 0.3)
  )
  return (
    <group ref={ref}>
      <Text hAlign="left" position={[0, 4.2, 0]} children="REACT" />
      <Text hAlign="left" position={[0, 0, 0]} children="THREE" />
      <Text hAlign="left" position={[0, -4.2, 0]} children="FIBER" />
      <Text hAlign="left" position={[12, 0, 0]} children="3" size={3} />
      <Text hAlign="left" position={[16.5, -4.2, 0]} children="X" />
    </group>
  )
}

// This component was auto-generated from GLTF by: https://github.com/react-spring/gltfjsx
function Bird({ speed, factor, url, ...props }) {
  const gltf = useLoader(GLTFLoader, url)
  const group = useRef()
  const [mixer] = useState(() => new THREE.AnimationMixer())
  useEffect(() => void mixer.clipAction(gltf.animations[0], group.current).play(), [gltf.animations, mixer])
  useFrame((state, delta) => {
    group.current.rotation.y += Math.sin((delta * factor) / 2) * Math.cos((delta * factor) / 2) * 1.5
    mixer.update(delta * speed)
  })
  return (
    <group ref={group}>
      <scene name="Scene" {...props}>
        <mesh
          name="Object_0"
          morphTargetDictionary={gltf.__$[1].morphTargetDictionary}
          morphTargetInfluences={gltf.__$[1].morphTargetInfluences}
          rotation={[1.5707964611537577, 0, 0]}
        >
          <bufferGeometry attach="geometry" {...gltf.__$[1].geometry} />
          <meshStandardMaterial attach="material" {...gltf.__$[1].material} name="Material_0_COLOR_0" />
        </mesh>
      </scene>
    </group>
  )
}

function Birds() {
  return new Array(100).fill().map((_, i) => {
    const x = (15 + Math.random() * 30) * (Math.round(Math.random()) ? -1 : 1)
    const y = -10 + Math.random() * 20
    const z = -5 + Math.random() * 10
    const index = Math.round(Math.random() * (birds.length - 1))
    const bird = birds[index]
    let speed = index === 2 ? 0.5 : index === 0 ? 2 : 5
    let factor = index === 2 ? 0.5 + Math.random() : index === 0 ? 0.25 + Math.random() : 1 + Math.random() - 0.5
    return (
      <Bird
        key={i}
        position={[x, y, z]}
        rotation={[0, x > 0 ? Math.PI : 0, 0]}
        speed={speed}
        factor={factor}
        url={bird}
      />
    )
  })
}

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 35] }}
      style={{ background: 'radial-gradient(at 50% 60%, #873740 0%, #272730 40%, #171720 80%, #070710 100%)' }}
    >
      <ambientLight intensity={2} />
      <pointLight position={[40, 40, 40]} />
      <Suspense fallback={null}>
        <Jumbo />
        <Birds />
      </Suspense>
    </Canvas>
  )
}
