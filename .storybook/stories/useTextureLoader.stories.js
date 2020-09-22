import React, { Suspense } from 'react'

import { Setup } from '../Setup'

import { useTextureLoader } from '../../src/loaders/useTextureLoader'
import { Icosahedron, Sphere } from '../../src/shapes'

export default {
  title: 'Loaders/Texture',
  component: useTextureLoader,
  decorators: [(storyFn) => <Setup>{storyFn()}</Setup>],
}

function TexturedMeshes() {
  const [matcap1, matcap2] = useTextureLoader(['matcap-1.png', 'matcap-2.png'])

  return (
    <>
      <Icosahedron position={[-2, 0, 0]}>
        <meshMatcapMaterial matcap={matcap1} attach="material" />
      </Icosahedron>
      <Icosahedron position={[2, 0, 0]}>
        <meshMatcapMaterial matcap={matcap2} attach="material" />
      </Icosahedron>
    </>
  )
}

function UseTextureLoaderScene() {
  return (
    <Suspense fallback={null}>
      <TexturedMeshes />
    </Suspense>
  )
}

export const UseTextureLoaderSceneSt = () => <UseTextureLoaderScene />
UseTextureLoaderSceneSt.story = {
  name: 'Default',
}
