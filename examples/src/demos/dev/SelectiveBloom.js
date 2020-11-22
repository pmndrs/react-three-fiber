import * as THREE from 'three'
import * as React from 'react'
import { Canvas, useThree, useFrame } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

function Sphere({ geometry, x, y, z, s }) {
  const [active, set] = React.useState(false)

  const onPointerOver = React.useCallback(function callback(e) {
    e.stopPropagation()
    set(true)
  }, [])

  const onPointerOut = React.useCallback(function callback(e) {
    set(false)
  }, [])

  const position = React.useMemo(() => [x, y, z], [x, y, z])
  const scale = React.useMemo(() => [s, s, s], [s])
  const userData = React.useMemo(() => ({ active }), [active])

  return (
    <mesh
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      position={position}
      scale={scale}
      geometry={geometry}
      userData={userData}
    >
      <meshStandardMaterial attach="material" color="hotpink" roughness={1} />
    </mesh>
  )
}

function RandomSpheres() {
  const [geometry] = React.useState(() => new THREE.IcosahedronBufferGeometry(1, 4), [])
  const data = React.useMemo(() => new Array(25).fill().map((_, i) => ({
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      z: Math.random() * 100 - 50,
      s: Math.random() + 10,
    }))
  , [])

  return data.map((props, i) => <Sphere key={i} {...props} geometry={geometry} />)
}

function Bloom({ children }) {
  const { gl, camera, size } = useThree()
  const scene = React.useRef()
  const composer = React.useRef()
  React.useEffect(() => {
    composer.current = new EffectComposer(gl)
    composer.current.addPass(new RenderPass(scene.current, camera))
    composer.current.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 1.5, 1, 0))
  }, [gl, camera, size.height, size.width])
  React.useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  useFrame(() => composer.current.render(), 1)
  return <scene ref={scene}>{children}</scene>
}

function Main({ children }) {
  const scene = React.useRef()
  const { gl, camera } = useThree()
  useFrame(() => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene.current, camera)), 2)
  return <scene ref={scene}>{children}</scene>
}

const camera = { position: [0, 0, 100] }

function SelectiveBloom() {
  return (
    <Canvas camera={camera}>
      <Main>
        <pointLight />
        <ambientLight />
        <RandomSpheres />
      </Main>
      <Bloom>
        <ambientLight />
        <RandomSpheres />
      </Bloom>
    </Canvas>
  )
}

export default React.memo(SelectiveBloom)
