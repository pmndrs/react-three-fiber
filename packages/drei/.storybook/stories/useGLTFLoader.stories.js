import React, { Suspense } from 'react'

import { Setup } from '../Setup'

import { useGLTFLoader } from '../../src/loaders/useGLTFLoader'

export default {
  title: 'Loaders/GLTF',
  component: useGLTFLoader,
  decorators: [(storyFn) => <Setup cameraPosition={[0, 0, 5]}>{storyFn()}</Setup>],
}

function Suzanne() {
  const { nodes, materials } = useGLTFLoader('suzanne.glb', true)

  return <mesh material={materials['Material.001']} geometry={nodes.Suzanne.geometry} />
}

function UseGLTFLoaderScene() {
  return (
    <Suspense fallback={null}>
      <Suzanne />
    </Suspense>
  )
}

export const UseGLTFLoaderSceneSt = () => <UseGLTFLoaderScene />
UseGLTFLoaderSceneSt.story = {
  name: 'Default',
}

function SuzanneWithLocal() {
  const { nodes, materials } = useGLTFLoader('suzanne.glb', "/draco-gltf/")

  return (
    <group dispose={null}>
      <mesh material={materials['Material.001']} geometry={nodes.Suzanne.geometry} />
    </group>
  )
}

function DracoLocalScene() {
  return (
    <Suspense fallback={null}>
      <SuzanneWithLocal />
    </Suspense>
  )
}

export const DracoLocalSceneSt = () => <DracoLocalScene />
DracoLocalSceneSt.story = {
  name: 'Local Binaries',
}

