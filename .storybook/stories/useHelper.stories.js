import React, { useRef } from 'react'

import { BoxHelper, CameraHelper } from 'three'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { FaceNormalsHelper } from 'three/examples/jsm/helpers/FaceNormalsHelper'

import { Setup } from '../Setup'

import { Sphere } from '../../src/shapes'
import { useHelper } from '../../src/useHelper'
import { PerspectiveCamera } from '../../src/PerspectiveCamera'

export default {
  title: 'Misc.useHelper',
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
DefaultStory.storyName = 'Default'

function CameraScene() {
  const camera = useRef()
  useHelper(camera, CameraHelper, 1, 'hotpink')

  return (
    <PerspectiveCamera makeDefault={false} position={[3, 3, 3]} ref={camera}>
      <meshBasicMaterial attach="material" />
    </PerspectiveCamera>
  )
}

export const CameraStory = () => <CameraScene />
CameraStory.storyName = 'Camera Helper'
