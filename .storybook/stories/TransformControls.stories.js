import React from 'react'

import { Setup } from '../Setup'

import { TransformControls } from '../../src/TransformControls'
import { Box } from '../../src/shapes'

export function TransformControlsStory() {
  return (
    <TransformControls>
      <Box>
        <meshBasicMaterial attach="material" wireframe />
      </Box>
    </TransformControls>
  )
}

TransformControlsStory.story = {
  name: 'Default',
}

export default {
  title: 'Controls.TransformControls',
  component: TransformControls,
  decorators: [(storyFn) => <Setup>{storyFn()}</Setup>],
}
