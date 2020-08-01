import React from 'react'

import { withKnobs, number, boolean } from '@storybook/addon-knobs'

import { Setup } from '../Setup'
import { MeshDistortMaterial } from '../../src/MeshDistortMaterial'
import { Icosahedron } from '../../src/shapes'

export default {
  title: 'Shaders/MeshDistortMaterial',
  component: MeshDistortMaterial,
  decorators: [withKnobs, (storyFn) => <Setup> {storyFn()}</Setup>],
}

function MeshDistortMaterialScene() {
  return (
    <Icosahedron args={[1, 4]}>
      <MeshDistortMaterial
        attach="material"
        color="#f25042"
        distort={number('Distort', 0.4, { range: true, min: 0, max: 1, step: 0.1 })}
        radius={number('Radius', 1, { range: true, min: 0, max: 1, step: 0.1 })}
      />
    </Icosahedron>
  )
}

export const MeshDistortMaterialSt = () => <MeshDistortMaterialScene />
MeshDistortMaterialSt.storyName = 'Default'
