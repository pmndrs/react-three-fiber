import React, { Suspense } from 'react'
import { useLoader } from 'react-three-fiber'
import { useAspect } from '../../src/useAspect'

import { Plane } from '../../src/shapes'

import { Setup } from '../Setup'
import { TextureLoader } from 'three'

export default {
  title: 'Misc.useAspect',
  component: useAspect,
  decorators: [(storyFn) => <Setup cameraPosition={[0, -10, 0]}>{storyFn()}</Setup>],
}

function Simple(props) {
  const scale = useAspect('cover', 1920, 1080, 1)

  return (
    <Plane scale={scale} rotation-x={Math.PI / 2} args={[1, 1, 4, 4]}>
      <meshPhongMaterial attach="material" wireframe />
    </Plane>
  )
}

export const DefaultStory = () => (
  <Suspense fallback="">
    <Simple />
  </Suspense>
)
DefaultStory.storyName = 'Default'

function WithTexture(props) {
  const scale = useAspect('cover', 1920, 1080, 1)

  const [map] = useLoader(TextureLoader, [`https://source.unsplash.com/random/1920x1080`])

  return (
    <Plane scale={scale} rotation-x={Math.PI / 2}>
      <meshPhongMaterial attach="material" map={map} color="grey" />
    </Plane>
  )
}

export const TextureStory = () => (
  <Suspense fallback="">
    <WithTexture />
  </Suspense>
)
TextureStory.storyName = 'With Texture'
