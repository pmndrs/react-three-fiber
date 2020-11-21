import * as React from 'react'
import { unstable_createResource as createResource } from '../../resources/cache'
// react-cache is still experimental and isn't currently compatible with react 16.8.x
//import { unstable_createResource as createResource } from 'react-cache'
import { Canvas } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// Creates a cached async resource
const resource = createResource(
  (file) =>
    new Promise(
      async (res) =>
        await [
          new Promise((r) => setTimeout(r, 1000)),
          new GLTFLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models' + file, res),
        ]
    )
)

const position1 = [0, -5, 0]

function Model({ file }) {
  // Read from cache ... this will throw an exception which will be caught by <React.Suspense />
  const { scene } = resource.read(file)
  console.log(scene)
  // It won't come to this point until the resource has been fetched
  return <primitive object={scene} position={position1} />
}

const boxArgs = [1, 1, 1]

function Box() {
  return (
    <mesh>
      <boxBufferGeometry attach="geometry" args={boxArgs} />
      <meshStandardMaterial attach="material" transparent opacity={0.5} />
    </mesh>
  )
}

const camera = { position: [0, 0, 10] }
const spotLightPosition = [300, 300, 400]
const buttonStyle = { position: 'absolute', top: '50%', left: '50%', color: 'white', backgroundColor: 'red', fontSize: 16, padding: '10px', borderRadius: 5, transform: 'translateX(-50%) translateY(-50%)'}

function Suspense() {
  const [clicked, set] = React.useState(false)
  const onClick = React.useCallback(function callback() {
    set(true)
  }, [])
  return (
    <>
      <Canvas camera={camera}>
        <ambientLight intensity={0.5} />
        <spotLight intensity={0.8} position={spotLightPosition} />
        <React.Suspense fallback={<Box />}>{clicked && <Model file="/gltf/Duck/glTF/Duck.gltf" />}</React.Suspense>
      </Canvas>
      {!clicked && (
        <button style={buttonStyle} onClick={onClick}>
          Load duck w/ 1s delay
        </button>
      )}
    </>
  )
}

export default React.memo(Suspense)
