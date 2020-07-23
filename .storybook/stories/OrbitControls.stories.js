import React from 'react'
import { withKnobs, boolean } from '@storybook/addon-knobs'

import { Setup } from '../Setup'

import { OrbitControls } from '../../src/OrbitControls'
import { Box } from '../../src/shapes'

export function OrbitControlsStory() {
  return (
    <>
      <OrbitControls
        enablePan={boolean('Pan', true)}
        enableZoom={boolean('Zoom', true)}
        enableRotate={boolean('Rotate', true)}
      />
      <Box>
        <meshBasicMaterial attach="material" wireframe />
      </Box>
    </>
  )
}

OrbitControlsStory.storyName = 'Default'

export default {
  title: 'Controls/OrbitControls',
  component: OrbitControls,
  decorators: [withKnobs, (storyFn) => <Setup controls={false}>{storyFn()}</Setup>],
}
