import React from 'react'

import { Setup } from '../Setup'
import { MeshDistortMaterial } from '../../src/MeshDistortMaterial'
import { Icosahedron } from '../../src/shapes'

export default {
  title: 'Shaders/MeshDistortMaterial',
  component: MeshDistortMaterial,
  decorators: [(storyFn) => <Setup> {storyFn()}</Setup>],
}

console.log(MeshDistortMaterial)

function MeshDistortMaterialScene() {
  return (
    <Icosahedron args={[1, 4]}>
      <MeshDistortMaterial attach="material" color="#f25042" distort={0.4} radius={1} />
    </Icosahedron>
  )
}

export const MeshDistortMaterialSt = () => <MeshDistortMaterialScene />
MeshDistortMaterialSt.storyName = 'Default'
