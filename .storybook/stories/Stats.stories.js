import React, { useRef } from 'react'

import { Setup } from '../Setup'

import { Sphere } from '../../src/shapes'
import { Stats } from '../../src/Stats'

export default {
  title: 'Misc.Stats',
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
DefaultStory.story = {
  name: 'Default',
}
