import React from 'react'

import { Setup } from '../Setup'

import { Stars } from '../../src/Stars'
import { Plane } from '../../src/shapes'

export default {
  title: 'Abstractions/Stars',
  component: Stars,
  decorators: [(storyFn) => <Setup> {storyFn()}</Setup>],
}

function StarsScene() {
  return (
    <>
      <Stars />
      <Plane rotation-x={Math.PI / 2} args={[100, 100, 4, 4]}>
        <meshBasicMaterial color="black" wireframe attach="material" />
      </Plane>
      <axesHelper />
    </>
  )
}

export const StarsSt = () => <StarsScene />
StarsSt.storyName = 'Default'
