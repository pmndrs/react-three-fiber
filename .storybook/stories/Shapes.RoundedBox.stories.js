import React from 'react'

import { Setup } from '../Setup'
import { useTurntable } from '../useTurntable'

import { withKnobs, number } from '@storybook/addon-knobs'

import { RoundedBox } from '../../src/shapes'

export default {
  title: 'Shapes/RoundedBox',
  component: RoundedBox,
  decorators: [withKnobs, (storyFn) => <Setup cameraPosition={[-30, 30, 30]}>{storyFn()}</Setup>],
}

function RoundedBoxScene() {
  const ref = useTurntable()

  return (
    <RoundedBox
      ref={ref}
      args={[number('width', 25), number('height', 25), number('depth', 25)]}
      radius={number('radius', 1)}
      smoothness={number('smoothness', 5)}>
      <meshPhongMaterial attach="material" color="#f3f3f3" wireframe />
    </RoundedBox>
  )
}

export const RoundedBoxSt = () => <RoundedBoxScene />
RoundedBoxSt.storyName = 'Default'
