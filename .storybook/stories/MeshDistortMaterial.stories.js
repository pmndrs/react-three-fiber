import React from 'react'

import { withKnobs, number } from '@storybook/addon-knobs'

import { Setup } from '../Setup'
import { MeshDistortMaterial } from '../../src/shaders/MeshDistortMaterial'
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
        speed={number('Speed', 1, { range: true, max: 10, step: 0.1 })}
        distort={number('Distort', 0.6, { range: true, min: 0, max: 1, step: 0.1 })}
        radius={number('Radius', 1, { range: true, min: 0, max: 1, step: 0.1 })}
      />
    </Icosahedron>
  )
}

export const MeshDistortMaterialSt = () => <MeshDistortMaterialScene />
MeshDistortMaterialSt.storyName = 'Default'
