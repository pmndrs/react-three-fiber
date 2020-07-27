import React from 'react'

import { Setup } from '../Setup'

import { Stats } from '../../src/Stats'

export default {
  title: 'Misc/Stats',
  component: Stats,
  decorators: [(storyFn) => <Setup>{storyFn()}</Setup>],
}

function Scene() {
  return (
    <>
      <axisHelper />
      <Stats />
    </>
  )
}

export const DefaultStory = () => <Scene />
DefaultStory.storyName = 'Default'
