import * as THREE from 'three'
import * as React from 'react'
import { Canvas, useLoader, useFrame, useThree, extend } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import stork from '../../resources/gltf/stork.glb'
extend({ OrbitControls })

function Model({ factor = 1, speed = 1, ...props }) {
  const group = React.useRef()
  const { nodes, materials, animations } = useLoader(GLTFLoader, stork)

  const [mixer] = React.useState(() => new THREE.AnimationMixer())
  React.useEffect(() => void mixer.clipAction(animations[0], group.current).play(), [animations, mixer])
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
  const ref = React.useRef()
  const { camera, gl } = useThree()
  useFrame(() => ref.current.update())
  return <orbitControls ref={ref} args={[camera, gl.domElement]} enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
}

const style = { background: '#dfdfdf' }
const camera = { position: [0, 0, 10] }
const pointLightPosition = [0, 0, -50]
const angle = Math.PI / 10
const spotLightPosition = [150, 150, 150]
const position1 = [5, 0, 0]
const position2 = [-5, 0, 0]

function GLTFAnimation() {
  return (
    <Canvas style={style} camera={camera}>
      <pointLight intensity={5} position={pointLightPosition} />
      <spotLight
        intensity={2}
        angle={angle}
        position={spotLightPosition}
        penumbra={1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <React.Suspense fallback={null}>
        <Model />
        <Model position={position1} />
        <Model position={position2} />
      </React.Suspense>
      <Controls />
    </Canvas>
  )
}

export default React.memo(GLTFAnimation)
