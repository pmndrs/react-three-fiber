import React, { useRef, useEffect } from 'react'

import { withKnobs, optionsKnob, boolean } from '@storybook/addon-knobs'

import { Setup } from '../Setup'

import { TransformControls } from '../../src/controls/TransformControls'
import { Box } from '../../src/shapes'
import { OrbitControls } from '../../src/controls/OrbitControls'

export function TransformControlsStory() {
  return (
    <Setup>
      <TransformControls>
        <Box>
          <meshBasicMaterial attach="material" wireframe />
        </Box>
      </TransformControls>
    </Setup>
  )
}

TransformControlsStory.storyName = 'Default'

export default {
  title: 'Controls/TransformControls',
  component: TransformControls,
}

function TransformControlsLockScene({ mode, showX, showY, showZ }) {
  const orbitControls = useRef()
  const transformControls = useRef()

  useEffect(() => {
    if (transformControls.current) {
      const controls = transformControls.current
      const callback = (event) => (orbitControls.current.enabled = !event.value)
      controls.addEventListener('dragging-changed', callback)
      return () => controls.removeEventListener('dragging-changed', callback)
    }
  })

  return (
    <>
      <TransformControls ref={transformControls} mode={mode} showX={showX} showY={showY} showZ={showZ}>
        <Box>
          <meshBasicMaterial attach="material" wireframe />
        </Box>
      </TransformControls>
      <OrbitControls ref={orbitControls} />
    </>
  )
}

export const TransformControlsLockSt = () => {
  const modesObj = {
    scale: 'scale',
    rotate: 'rotate',
    translate: 'translate',
  }

  return (
    <TransformControlsLockScene
      mode={optionsKnob('mode', modesObj, 'translate', {
        display: 'radio',
      })}
      showX={boolean('showX', true)}
      showY={boolean('showY', true)}
      showZ={boolean('showZ', true)}
    />
  )
}

TransformControlsLockSt.storyName = 'Lock orbit controls while transforming'
TransformControlsLockSt.decorators = [withKnobs, (storyFn) => <Setup controls={false}>{storyFn()}</Setup>]
