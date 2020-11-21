import * as THREE from 'three'
import * as React from 'react'
import { Canvas, useLoader, useFrame } from 'react-three-fiber'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib'

RectAreaLightUniformsLib.init()

const makeUrl = (file) => `https://raw.githubusercontent.com/flowers1225/threejs-earth/master/src/img/${file}.jpg`
const position1 = [10, 10, 10]
const position2 = [-10, -10, -10]
const args1 = [2, 64, 64]
const position3 = [5, 0, -10]
const args2 = [0.5, 64, 64]
const attachObjectAttributesPosition = ['attributes', 'position']

function Earth() {
  const ref = React.useRef()
  const [texture, bump, moon] = useLoader(THREE.TextureLoader, [
    makeUrl('earth4'),
    makeUrl('earth_bump'),
    'http://jaanga.github.io/moon/heightmaps/WAC_GLD100_E000N1800_004P-1024x512.png',
  ])
  useFrame(
    ({ clock }) =>
      (ref.current.rotation.x = ref.current.rotation.y = ref.current.rotation.z =
        Math.cos(clock.getElapsedTime() / 8) * Math.PI)
  )
  const onUpdate = React.useCallback(function callback(self) {
    self.lookAt(new THREE.Vector3(0, 0, 0))
  }, [])

  return (
    <group ref={ref}>
      <Stars />
      <rectAreaLight intensity={1} position={position1} width={10} height={1000} onUpdate={onUpdate} />
      <rectAreaLight intensity={1} position={position2} width={1000} height={10} onUpdate={onUpdate} />
      <mesh>
        <sphereBufferGeometry args={args1} />
        <meshStandardMaterial map={texture} bumpMap={bump} bumpScale={0.05} />
      </mesh>
      <mesh position={position3}>
        <sphereBufferGeometry args={args2} />
        <meshStandardMaterial color="gray" map={moon} />
      </mesh>
    </group>
  )
}

function Stars({ count = 5000 }) {
  const positions = React.useMemo(() => {
    let positions = []
    for (let i = 0; i < count; i++) {
      positions.push(Math.random() * 10 * (Math.round(Math.random()) ? -40 : 40))
      positions.push(Math.random() * 10 * (Math.round(Math.random()) ? -40 : 40))
      positions.push(Math.random() * 10 * (Math.round(Math.random()) ? -40 : 40))
    }
    return new Float32Array(positions)
  }, [count])
  return (
    <points>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attachObject={attachObjectAttributesPosition}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={1} sizeAttenuation color="white" transparent opacity={0.8} />
    </points>
  )
}

const style = { background: 'radial-gradient(at 50% 70%, #200f20 40%, #090b1f 80%, #050523 100%)' }
const camera = { position: [0, 0, 8], fov: 40 }
const pointLightPosition = [10, 10, 10]
const rectAreaLightPosition = [0, 10, -10]

export default function Textures() {
  const onUpdate = React.useCallback(function callback(self) {
    self.lookAt(new THREE.Vector3(0, 0, 0))
  }, [])

  return (
    <Canvas style={style} camera={camera}>
      <pointLight intensity={0.1} position={pointLightPosition} />
      <rectAreaLight intensity={3} position={rectAreaLightPosition} width={30} height={30} onUpdate={onUpdate} />
      <React.Suspense fallback={null}>
        <Earth />
      </React.Suspense>
    </Canvas>
  )
}
