import * as THREE from 'three'
import ReactDOM from 'react-dom'
import React, { Suspense } from 'react'
import { Canvas, useLoader } from 'react-three-fiber'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib'

RectAreaLightUniformsLib.init()

const url = 'https://raw.githubusercontent.com/flowers1225/threejs-earth/master/src/img/earth4.jpg'
const bumpUrl = 'https://raw.githubusercontent.com/flowers1225/threejs-earth/master/src/img/earth_bump.jpg'
const specUrl = 'https://raw.githubusercontent.com/flowers1225/threejs-earth/master/src/img/earth_spec.jpg'

function Sphere() {
  const [texture, bump, spec] = useLoader(THREE.TextureLoader, [url, bumpUrl, specUrl])
  return (
    <mesh>
      <sphereBufferGeometry attach="geometry" args={[2, 32, 32]} />
      <meshPhysicalMaterial attach="material" map={texture} bumpMap={bump} bumpScale={0.3} metalnessMap={spec} />
    </mesh>
  )
}

export default () => (
  <Canvas>
    <ambientLight intensity={0.1} />
    <rectAreaLight
      intensity={3}
      position={[10, 10, 10]}
      width={10}
      height={1000}
      onUpdate={self => self.lookAt(new THREE.Vector3(0, 0, 0))}
    />
    <rectAreaLight
      intensity={2}
      position={[-10, -10, -10]}
      width={1000}
      height={10}
      onUpdate={self => self.lookAt(new THREE.Vector3(0, 0, 0))}
    />
    <Suspense fallback={null}>
      <Sphere />
    </Suspense>
  </Canvas>
)
