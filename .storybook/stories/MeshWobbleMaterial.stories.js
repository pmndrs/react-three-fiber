import React from 'react'

import { withKnobs, number } from '@storybook/addon-knobs'

import { Setup } from '../Setup'
import { MeshWobbleMaterial } from '../../src/shaders/MeshWobbleMaterial'
import { Torus } from '../../src/shapes'

export default {
  title: 'Shaders/MeshWobbleMaterial',
  component: MeshWobbleMaterial,
  decorators: [withKnobs, (storyFn) => <Setup> {storyFn()}</Setup>],
}

function MeshWobbleMaterialScene() {
  return (
    <Torus args={[1, 0.25, 16, 100]}>
      <MeshWobbleMaterial
        attach="material"
        color="#f25042"
        speed={number('Speed', 1, { range: true, max: 10, step: 0.1 })}
        factor={number('Factor', 0.6, { range: true, min: 0, max: 1, step: 0.1 })}
      />
    </Torus>
  )
}

export const MeshWobbleMaterialSt = () => <MeshWobbleMaterialScene />
MeshWobbleMaterialSt.storyName = 'Default'
