import * as THREE from 'three'
import React, { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useThree, useFrame } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

function Sphere({ geometry, x, y, z, s }) {
  const [active, set] = useState(false)
  return (
    <mesh
      onPointerOver={() => set(true)}
      onPointerOut={() => set(false)}
      position={[x, y, z]}
      scale={[s, s, s]}
      geometry={geometry}
      userData={{ active }}>
      <meshStandardMaterial attach="material" color="hotpink" roughness={1} />
    </mesh>
  )
}

function RandomSpheres() {
  const [geometry] = useState(() => new THREE.IcosahedronBufferGeometry(1, 4), [])
  const data = useMemo(() => {
    return new Array(25).fill().map((_, i) => ({
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      z: Math.random() * 100 - 50,
      s: Math.random() + 10,
    }))
  }, [])
  return data.map((props, i) => <Sphere key={i} {...props} geometry={geometry} />)
}

function Bloom({ children }) {
  const { gl, camera, size } = useThree()
  const scene = useRef()
  const composer = useRef()
  useEffect(() => {
    composer.current = new EffectComposer(gl)
    composer.current.addPass(new RenderPass(scene.current, camera))
    composer.current.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 1.5, 1, 0))
  }, [])
  useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  useFrame(() => composer.current.render(), 1)
  return <scene ref={scene}>{children}</scene>
}

function Main({ children }) {
  const scene = useRef()
  const { gl, camera } = useThree()
  useFrame(() => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene.current, camera)), 2)
  return <scene ref={scene}>{children}</scene>
}

export default () => (
  <Canvas camera={{ position: [0, 0, 100] }}>
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
