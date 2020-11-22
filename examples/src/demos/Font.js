import * as THREE from 'three'
import * as React from 'react'
import { Canvas, useLoader, useFrame, useUpdate } from 'react-three-fiber'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import flamingo from '../resources/gltf/flamingo.glb'
import parrot from '../resources/gltf/parrot.glb'
import stork from '../resources/gltf/stork.glb'
import bold from '../resources/fonts/bold.blob'

const birds = [flamingo, parrot, stork]

function Text({ children, vAlign = 'center', hAlign = 'center', size = 1, color = '#000000', ...props }) {
  const font = useLoader(THREE.FontLoader, bold)
  const config = React.useMemo(
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
  const scale = React.useMemo(() => [0.1 * size, 0.1 * size, 0.1], [size])

  const args = React.useMemo(() => [children, config], [children, config])

  return (
    <group {...props} scale={scale}>
      <mesh ref={mesh}>
        <textGeometry attach="geometry" args={args} />
        <meshNormalMaterial attach="material" />
      </mesh>
    </group>
  )
}

const position1 = [0, 4.2, 0]
const position2 = [0, 0, 0]
const position3 = [0, -4.2, 0]
const position4 = [12, 0, 0]
const position5 = [16.5, -4.2, 0]

function Jumbo() {
  const ref = React.useRef()
  useFrame(
    ({ clock }) =>
      (ref.current.rotation.x = ref.current.rotation.y = ref.current.rotation.z =
        Math.sin(clock.getElapsedTime()) * 0.3)
  )

  return (
    <group ref={ref}>
      <Text hAlign="left" position={position1} children="REACT" />
      <Text hAlign="left" position={position2} children="THREE" />
      <Text hAlign="left" position={position3} children="FIBER" />
      <Text hAlign="left" position={position4} children="3" size={3} />
      <Text hAlign="left" position={position5} children="X" />
    </group>
  )
}

const rotation1 = [1.5707964611537577, 0, 0]

// This component was auto-generated from GLTF by: https://github.com/react-spring/gltfjsx
function Bird() {
  const index = Math.round(Math.random() * (birds.length - 1))
  const url = birds[index]
  let speed = index === 2 ? 0.5 : index === 0 ? 2 : 5
  let factor = index === 2 ? 0.5 + Math.random() : index === 0 ? 0.25 + Math.random() : 1 + Math.random() - 0.5
  const { nodes, materials, animations } = useLoader(GLTFLoader, url)
  const group = React.useRef()
  const [mixer] = React.useState(() => new THREE.AnimationMixer())
  React.useEffect(() => void mixer.clipAction(animations[0], group.current).play(), [animations, mixer])
  useFrame((state, delta) => {
    group.current.rotation.y += Math.sin((delta * factor) / 2) * Math.cos((delta * factor) / 2) * 1.5
    mixer.update(delta * speed)
  })

  const x = (15 + Math.random() * 30) * (Math.round(Math.random()) ? -1 : 1)

  // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
  const position = [
    x,
    -10 + Math.random() * 20,
    -5 + Math.random() * 10,
  ]

  // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
  const rotation2 = [0, x > 0 ? Math.PI : 0, 0]

  return (
    <group ref={group}>
      <scene name="Scene" position={position} rotation={rotation2}>
        <mesh
          name="Object_0"
          material={materials.Material_0_COLOR_0}
          geometry={nodes.Object_0.geometry}
          morphTargetDictionary={nodes.Object_0.morphTargetDictionary}
          morphTargetInfluences={nodes.Object_0.morphTargetInfluences}
          rotation={rotation1}
        />
      </scene>
    </group>
  )
}

function Birds() {
  return new Array(100).fill().map((_, i) => {
    return <Bird key={i} />
  })
}

const camera = { position: [0, 0, 35] }
const style = { background: 'radial-gradient(at 50% 60%, #873740 0%, #272730 40%, #171720 80%, #070710 100%)' }
const pointLightPosition = [40, 40, 40]

function Font() {
  return (
    <Canvas camera={camera} style={style}>
      <ambientLight intensity={2} />
      <pointLight position={pointLightPosition} />
      <React.Suspense fallback={null}>
        <Jumbo />
        <Birds />
      </React.Suspense>
    </Canvas>
  )
}

export default React.memo(Font)
