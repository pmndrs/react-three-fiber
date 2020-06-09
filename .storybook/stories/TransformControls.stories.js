import React, { useRef, useEffect, useState } from 'react'

import { Setup } from '../Setup'

import { TransformControls } from '../../src/TransformControls'
import { Box } from '../../src/shapes'
import { OrbitControls } from '../../src/OrbitControls'

export function TransformControlsStory() {
  return (
    <Setup >
      <TransformControls>
        <Box>
          <meshBasicMaterial attach="material" wireframe />
        </Box>
      </TransformControls>
    </Setup>
  )
}

TransformControlsStory.story = {
  name: 'Default',
}

export default {
  title: 'Controls.TransformControls',
  component: TransformControls,
}


function TransformControlsLockScene() {
  const orbitControls = useRef()
  const transformControls = useRef()

  useEffect(() => {
    if (transformControls.current) {
      const controls = transformControls.current
      const callback = event => (orbitControls.current.enabled = !event.value)
      controls.addEventListener("dragging-changed", callback)
      return () => controls.removeEventListener("dragging-changed", callback)
    }
  })

  return (
    <>
      <TransformControls ref={transformControls}>
        <Box>
          <meshBasicMaterial attach="material" wireframe />
        </Box>
      </TransformControls>
      <OrbitControls ref={orbitControls} />
    </>
  )
}

export const TransformControlsLockSt = () => <TransformControlsLockScene />

TransformControlsLockSt.story = {
  name: 'lock orbit controls while transforming',
  decorators: [(storyFn) => <Setup controls={false} >{storyFn()}</Setup>],
}
