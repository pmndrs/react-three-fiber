import React from 'react'
import { withKnobs, number, boolean } from '@storybook/addon-knobs'

import { Setup } from '../Setup'

import { FlyControls } from '../../src/controls/FlyControls'
import { Box } from '../../src/shapes'

export function FlyControlsStory() {
  return (
    <>
      <FlyControls
        autoForward={boolean('AutoForward', false)}
        dragToLook={boolean('DragToLook', false)}
        movementSpeed={number('MovementSpeed', 1.0)}
        rollSpeed={number('RollSpeed', 0.005)}
      />
      <Box>
        <meshBasicMaterial attach="material" wireframe />
      </Box>
    </>
  )
}

FlyControlsStory.storyName = 'Default'

export default {
  title: 'Controls/FlyControls',
  component: FlyControls,
  decorators: [withKnobs, (storyFn) => <Setup controls={false}>{storyFn()}</Setup>],
}
