import * as THREE from 'three'
import React, { Suspense, useRef, useMemo } from 'react'
import { Canvas, useLoader, useFrame } from 'react-three-fiber'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib'

RectAreaLightUniformsLib.init()

const makeUrl = (file) => `https://raw.githubusercontent.com/flowers1225/threejs-earth/master/src/img/${file}.jpg`

function Earth() {
  const ref = useRef()
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
  return (
    <group ref={ref}>
      <Stars />
      <rectAreaLight
        intensity={1}
        position={[10, 10, 10]}
        width={10}
        height={1000}
        onUpdate={(self) => self.lookAt(new THREE.Vector3(0, 0, 0))}
      />
      <rectAreaLight
        intensity={1}
        position={[-10, -10, -10]}
        width={1000}
        height={10}
        onUpdate={(self) => self.lookAt(new THREE.Vector3(0, 0, 0))}
      />
      <mesh>
        <sphereBufferGeometry args={[2, 64, 64]} />
        <meshStandardMaterial map={texture} bumpMap={bump} bumpScale={0.05} />
      </mesh>
      <mesh position={[5, 0, -10]}>
        <sphereBufferGeometry args={[0.5, 64, 64]} />
        <meshStandardMaterial color="gray" map={moon} />
      </mesh>
    </group>
  )
}

function Stars({ count = 5000 }) {
  const positions = useMemo(() => {
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
          attachObject={['attributes', 'position']}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={1} sizeAttenuation color="white" transparent opacity={0.8} />
    </points>
  )
}

export default () => (
  <Canvas
    style={{ background: 'radial-gradient(at 50% 70%, #200f20 40%, #090b1f 80%, #050523 100%)' }}
    camera={{ position: [0, 0, 8], fov: 40 }}
  >
    <pointLight intensity={0.1} position={[10, 10, 10]} />
    <rectAreaLight
      intensity={3}
      position={[0, 10, -10]}
      width={30}
      height={30}
      onUpdate={(self) => self.lookAt(new THREE.Vector3(0, 0, 0))}
    />
    <Suspense fallback={null}>
      <Earth />
    </Suspense>
  </Canvas>
)
