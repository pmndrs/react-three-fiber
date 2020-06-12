import React, { useRef } from 'react'

import { Setup } from '../Setup'

import { Sky } from '../../src/Sky'
import { Plane } from '../../src/shapes'

export default {
  title: 'Abstractions.Sky',
  component: Sky,
  decorators: [(storyFn) => <Setup> {storyFn()}</Setup>],
}

function SkyScene() {
  return (
    <>
      <Sky sunPosition={[0, Math.PI, -1]} />
      <Plane rotation-x={Math.PI / 2} args={[100, 100, 4, 4]}>
        <meshBasicMaterial color="black" wireframe attach="material" />
      </Plane>
      <axesHelper />
    </>
  )
}

export const SkySt = () => <SkyScene />
SkySt.story = {
  name: 'Default',
}
