import * as THREE from 'three'
import React, { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame, useResource } from 'react-three-fiber'
import { EffectComposer, DepthOfField, Bloom, Noise, Vignette } from 'react-postprocessing'
import { Html, Icosahedron, useTextureLoader, useCubeTextureLoader, MeshDistortMaterial } from 'drei'
import { LoadingMsg } from '../../styles'
import bumpMapUrl from './resources/bump.jpg'

import cubePxUrl from './resources/cube/px.png'
import cubeNxUrl from './resources/cube/nx.png'
import cubePyUrl from './resources/cube/py.png'
import cubeNyUrl from './resources/cube/ny.png'
import cubePzUrl from './resources/cube/pz.png'
import cubeNzUrl from './resources/cube/nz.png'

function MainSphere({ material }) {
  const main = useRef(null)
  // main sphere rotates following the mouse position
  useFrame(({ clock, mouse }) => {
    main.current.rotation.z = clock.getElapsedTime()
    main.current.rotation.y = THREE.MathUtils.lerp(main.current.rotation.y, mouse.x * Math.PI, 0.1)
    main.current.rotation.x = THREE.MathUtils.lerp(main.current.rotation.x, mouse.y * Math.PI, 0.1)
  })
  return <Icosahedron args={[1, 4]} ref={main} material={material} position={[0, 0, 0]} />
}

function Instances({ material }) {
  // we use this array ref to store the spheres after creating them
  const [sphereRefs] = useState(() => [])
  // we use this array to initialize the background spheres
  const initialPositions = [
    [-4, 20, -12],
    [-10, 12, -4],
    [-11, -12, -23],
    [-16, -6, -10],
    [12, -2, -3],
    [13, 4, -12],
    [14, -2, -23],
    [8, 10, -20],
  ]
  // smaller spheres movement
  useFrame(() => {
    // animate each sphere in the array
    sphereRefs.forEach((el) => {
      el.position.y += 0.02
      if (el.position.y > 19) el.position.y = -18
      el.rotation.x += 0.06
      el.rotation.y += 0.06
      el.rotation.z += 0.02
    })
  })
  return (
    <>
      <MainSphere material={material} />
      {initialPositions.map((pos, i) => (
        <Icosahedron
          args={[1, 4]}
          position={[pos[0], pos[1], pos[2]]}
          material={material}
          key={i}
          ref={(ref) => (sphereRefs[i] = ref)}
        />
      ))}
    </>
  )
}

function Scene() {
  const bumpMap = useTextureLoader(bumpMapUrl)
  const envMap = useCubeTextureLoader([cubePxUrl, cubeNxUrl, cubePyUrl, cubeNyUrl, cubePzUrl, cubeNzUrl], { path: '' })

  // We use `useResource` to be able to delay rendering the spheres until the material is ready
  const [matRef, material] = useResource()

  return (
    <>
      <MeshDistortMaterial
        ref={matRef}
        envMap={envMap}
        bumpMap={bumpMap as THREE.Texture}
        color={'#010101'}
        roughness={0.1}
        metalness={1}
        bumpScale={0.005}
        clearcoat={1}
        clearcoatRoughness={1}
        radius={1}
        distort={0.4}
      />
      {material && <Instances material={material} />}
    </>
  )
}

export default function Bubbles() {
  return (
    <Canvas
      colorManagement
      camera={{ position: [0, 0, 3] }}
      gl={{ powerPreference: 'high-performance', alpha: false, antialias: false, stencil: false, depth: false }}
    >
      <color attach="background" args={['#050505']} />
      <fog color="#161616" attach="fog" near={8} far={30} />
      <Suspense
        fallback={
          <Html center>
            <LoadingMsg>Loading...</LoadingMsg>
          </Html>
        }
      >
        <Scene />
      </Suspense>
      <EffectComposer>
        <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
        <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} opacity={0} />
        <Noise opacity={0.025} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  )
}
