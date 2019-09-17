import * as THREE from 'three'
import React, { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useLoader, useFrame, useThree, extend } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import stork from 'file-loader!../resources/gltf/stork.glb'
extend({ OrbitControls })

function Model(props) {
  const group = useRef()
  const [gltf, objects] = useLoader(GLTFLoader, stork)
  const actions = useRef()
  const [mixer] = useState(() => new THREE.AnimationMixer())
  useFrame((state, delta) => mixer.update(delta))
  useEffect(() => {
    const root = group.current
    actions.current = { storkFly_B_: mixer.clipAction(gltf.animations[0], root) }
    return () => gltf.animations.forEach(clip => mixer.uncacheClip(clip))
  }, [])
  useEffect(() => void actions.current.storkFly_B_.play(), [])
  return (
    <group ref={group} {...props}>
      <scene name="AuxScene">
        <mesh
          castShadow
          receiveShadow
          name="mesh_0"
          morphTargetDictionary={objects[1].morphTargetDictionary}
          morphTargetInfluences={objects[1].morphTargetInfluences}>
          <bufferGeometry attach="geometry" {...objects[1].geometry} />
          <meshStandardMaterial attach="material" {...objects[1].material} />
        </mesh>
      </scene>
    </group>
  )
}

export function Controls() {
  const ref = useRef()
  const { camera, gl } = useThree()
  useFrame(() => ref.current.update())
  return <orbitControls ref={ref} args={[camera, gl.domElement]} enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
}

export default function App() {
  return (
    <Canvas style={{ background: '#dfdfdf' }} camera={{ position: [0, 0, 200] }}>
      <pointLight intensity={5} position={[0, 0, -50]} />
      <spotLight
        intensity={2}
        angle={Math.PI / 10}
        position={[150, 150, 150]}
        penumbra={1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Suspense fallback={null}>
        <Model />
        <Model position={[50, 0, 0]} />
        <Model position={[-50, 0, 0]} />
      </Suspense>
      <Controls />
    </Canvas>
  )
}
