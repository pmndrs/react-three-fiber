import * as THREE from 'three'
import React, { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useLoader, useFrame, useThree, extend } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import stork from '../../resources/gltf/stork.glb'
extend({ OrbitControls })

function Model({factor = 1, speed  = 1, ...props}) {
  const group = useRef()
  const { nodes, materials, animations } = useLoader(GLTFLoader, stork)


  const [mixer] = useState(() => new THREE.AnimationMixer())
  useEffect(() => void mixer.clipAction(animations[0], group.current).play(), [animations, mixer])
  useFrame((state, delta) => {
    mixer.update(delta * speed)
  })

  return (
    <group ref={group} {...props} dispose={null}>
      <mesh
        name="Object_0"
        material={materials.Material_0_COLOR_0}
        geometry={nodes.Object_0.geometry}
        morphTargetDictionary={nodes.Object_0.morphTargetDictionary}
        morphTargetInfluences={nodes.Object_0.morphTargetInfluences}
        rotation={[Math.PI / 2, 0, 0]}
      />
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
    <Canvas style={{ background: '#dfdfdf' }} camera={{ position: [0, 0, 10] }}>
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
        <Model position={[5, 0, 0]} />
        <Model position={[-5, 0, 0]} />
      </Suspense>
      <Controls />
    </Canvas>
  )
}
