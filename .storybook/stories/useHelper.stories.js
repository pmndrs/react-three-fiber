import React, { useRef } from 'react'

import { BoxHelper } from 'three'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { FaceNormalsHelper } from 'three/examples/jsm/helpers/FaceNormalsHelper'

import { Setup } from '../Setup'

import { Sphere } from '../../src/shapes'
import { useHelper } from '../../src/useHelper'

export default {
  title: 'misc.useHelper',
  component: useHelper,
  decorators: [(storyFn) => <Setup>{storyFn()}</Setup>],
}

function Scene() {
  const mesh = useRef()
  useHelper(mesh, BoxHelper, 'royalblue')
  useHelper(mesh, VertexNormalsHelper, 1, 'red')
  useHelper(mesh, FaceNormalsHelper, 1, 'hotpink')

  return (
    <Sphere ref={mesh}>
      <meshBasicMaterial attach="material" />
    </Sphere>
  )
}

export const DefaultStory = () => <Scene />
DefaultStory.story = {
  name: 'Default',
}
