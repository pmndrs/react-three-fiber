import React from 'react'
import { withKnobs, boolean } from '@storybook/addon-knobs'
import { Setup } from '../Setup'

import { Billboard } from '../../src/Billboard'
import { OrbitControls } from '../../src/OrbitControls'

export default {
  title: 'Abstractions/Billboard',
  component: Billboard,
  decorators: [
    (storyFn) => (
      <Setup controls={false} cameraPosition={[0, 0, 10]}>
        {storyFn()}
      </Setup>
    ),
    withKnobs,
  ],
}

function BillboardStory() {
  const follow = boolean('follow', true)
  const lockX = boolean('lockX', false)
  const lockY = boolean('lockY', false)
  const lockZ = boolean('lockZ', false)

  return (
    <>
      <Billboard
        position={[-4, -2, 0]}
        args={[3, 2]}
        material-color="red"
        follow={follow}
        lockX={lockX}
        lockY={lockY}
        lockZ={lockZ}
      />
      <Billboard
        position={[-4, 2, 0]}
        args={[3, 2]}
        material-color="orange"
        follow={follow}
        lockX={lockX}
        lockY={lockY}
        lockZ={lockZ}
      />
      <Billboard
        position={[0, 0, 0]}
        args={[3, 2]}
        material-color="green"
        follow={follow}
        lockX={lockX}
        lockY={lockY}
        lockZ={lockZ}
      />
      <Billboard
        position={[4, -2, 0]}
        args={[3, 2]}
        material-color="blue"
        follow={follow}
        lockX={lockX}
        lockY={lockY}
        lockZ={lockZ}
      />
      <Billboard
        position={[4, 2, 0]}
        args={[3, 2]}
        material-color="yellow"
        follow={follow}
        lockX={lockX}
        lockY={lockY}
        lockZ={lockZ}
      />

      <OrbitControls enablePan={false} zoomSpeed={0.5} />
    </>
  )
}

export const BillboardSt = () => <BillboardStory />
BillboardSt.storyName = 'Default'
