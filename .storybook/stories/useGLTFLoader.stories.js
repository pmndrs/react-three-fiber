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
