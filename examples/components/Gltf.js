import * as THREE from 'three'
import React, { Suspense, useEffect, useRef } from 'react'
import { Canvas, useLoader, useFrame, useThree, extend } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import stork from 'file-loader!../resources/gltf/stork.glb'
extend({ OrbitControls })

function Model() {
  const group = useRef()
  const [gltf, objects] = useLoader(GLTFLoader, stork, loader => {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco-gltf/')
    loader.setDRACOLoader(dracoLoader)
  })

  const mixer = useRef()
  const actions = useRef({})
  useFrame((state, delta) => mixer.current && mixer.current.update(delta))
  useEffect(() => {
    const root = group.current
    mixer.current = new THREE.AnimationMixer(root)
    actions.current = { storkFly_B_: mixer.current.clipAction(gltf.animations[0]) }
    return () => root && mixer.current && mixer.current.uncacheRoot(root)
  }, [])

  useEffect(() => void actions.current.storkFly_B_.play(), [])

  return (
    <group ref={group}>
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
  return <orbitControls ref={ref} args={[camera, gl.domelement]} enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
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
      </Suspense>
      <Controls />
    </Canvas>
  )
}
