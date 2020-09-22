import { Vector3 } from 'three'
import React, { Suspense } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import ThorAndMidgardSerpent from '../public/scene_draco'
import { Html, Plane, useAspect, useTextureLoader } from '../../src'
import { Loader } from '../../src/prototyping/Loader'

export default {
  title: 'Prototyping/Loader',
  component: Loader,
}

function ZoomIn() {
  const vec = new Vector3(0, 10, 30)
  return useFrame(({ camera }) => camera.position.lerp(vec, 0.1))
}

function LoadedScene() {

  return (
      <ThorAndMidgardSerpent />
  )

}

function Scene() {
  return (
    <>
      <Canvas concurrent camera={{ position: [0, 15, 1000], fov: 70 }}>
        <color attach="background" args={[0x000000]} />
        <fog attach="fog" args={[0xfff0ea, 10, 60]} />
        <ambientLight intensity={6} />
        <Suspense
          fallback={
            <Html zIndexRange={[20, 20]}>
              <Loader innerStyles={{ width: 300 }} />
            </Html>
          }
        >
          <ZoomIn />
          <LoadedScene />
        </Suspense>
      </Canvas>
    </>
  )
}

export const LoaderSt = () => <Scene />
LoaderSt.story = {
  name: 'Default',
}
