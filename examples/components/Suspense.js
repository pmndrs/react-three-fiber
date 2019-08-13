import ReactDOM from 'react-dom'
import React, { Suspense, useState } from 'react'
import { unstable_createResource as createResource } from '../resources/cache'
// react-cache is still experimental and isn't currently compatible with react 16.8.x
//import { unstable_createResource as createResource } from 'react-cache'
import { Canvas } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// Creates a cached async resource
const resource = createResource(
  file =>
    new Promise(
      async res => (
        await new Promise(r => setTimeout(r, 1000)),
        new GLTFLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models' + file, res)
      )
    )
)

function Model({ file }) {
  // Read from cache ... this will throw an exception which will be caught by <Suspense />
  const { scene } = resource.read(file)
  console.log(scene)
  // It won't come to this point until the resource has been fetched
  return <primitive object={scene} position={[0, -5, 0]} />
}

function Box() {
  return (
    <mesh>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshStandardMaterial attach="material" transparent opacity={0.5} />
    </mesh>
  )
}

export default function App() {
  const [clicked, set] = useState(false)
  return (
    <>
      <Canvas camera={{ position: [0, 0, 10] }}>
        <ambientLight intensity={0.5} />
        <spotLight intensity={0.8} position={[300, 300, 400]} />
        <Suspense fallback={<Box />}>{clicked && <Model file="/gltf/Duck/glTF/Duck.gltf" />}</Suspense>
      </Canvas>
      {!clicked && (
        <button style={{ position: 'absolute', top: 0, left: 0 }} onClick={() => set(true)}>
          Load duck w/ 1s delay
        </button>
      )}
    </>
  )
}
