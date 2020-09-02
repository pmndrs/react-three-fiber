import React from 'react'
import { Setup } from '../Setup'
import { DeviceOrientationControls } from '../../src/controls/DeviceOrientationControls'
import { Box } from '../../src/shapes'

export function DeviceOrientationControlsStory() {
  return (
    <>
      <DeviceOrientationControls />
      <Box args={[100, 100, 100, 4, 4, 4]}>
        <meshBasicMaterial attach="material" wireframe />
        <axesHelper args={[100]} />
      </Box>
    </>
  )
}

DeviceOrientationControlsStory.storyName = 'Default'

export default {
  title: 'Controls/DeviceOrientationControls',
  component: DeviceOrientationControls,
  decorators: [
    (storyFn) => (
      <Setup camera={{ near: 1, far: 1100, fov: 75 }} controls={false}>
        {storyFn()}
      </Setup>
    ),
  ],
}
