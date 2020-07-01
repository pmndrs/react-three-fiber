import React from 'react'

import { Setup } from '../Setup'
import { MeshWobbleMaterial } from '../../src/MeshWobbleMaterial'
import { Torus } from '../../src/shapes'

export default {
  title: 'Shaders.MeshWobbleMaterial',
  component: MeshWobbleMaterial,
  decorators: [(storyFn) => <Setup> {storyFn()}</Setup>],
}

function MeshWobbleMaterialScene() {
  return (
    <Torus args={[1, 0.25, 16, 100]}>
      <MeshWobbleMaterial attach="material" color="#f25042" speed={1} factor={1} />
    </Torus>
  )
}

export const MeshWobbleMaterialSt = () => <MeshWobbleMaterialScene />
MeshWobbleMaterialSt.storyName = 'Default'
