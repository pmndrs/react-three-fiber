import React, { Suspense } from 'react'

import { Setup } from '../Setup'

import { useDetectGPU } from '../../src/misc/useDetectGPU'
import { Text } from '../../src/abstractions/Text'

export default {
  title: 'Misc/useDetectGPU',
  component: useDetectGPU,
  decorators: [(storyFn) => <Setup cameraPosition={[0, 0, 5]}>{storyFn()}</Setup>],
}

function Simple() {
  const GPUTier = useDetectGPU()

  return (
    <Text>
      {GPUTier.tier} {GPUTier.type}
    </Text>
  )
}

export const DefaultStory = () => (
  <Simple />
)
DefaultStory.storyName = 'Default'
