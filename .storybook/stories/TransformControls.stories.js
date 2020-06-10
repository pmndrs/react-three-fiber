import React, { useRef, useEffect } from 'react'

import { withKnobs, optionsKnob, boolean } from "@storybook/addon-knobs";

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

  // story data
  const modesObj = {
    scale: "scale",
    rotate: "rotate",
    translate: "translate"
  }

  const mode = optionsKnob("mode", modesObj, "translate", {
    display: 'radio'
  })

  const showX = boolean("showX", true)
  const showY = boolean("showY", true)
  const showZ = boolean("showZ", true)

  return (
    <>
      <TransformControls
        ref={transformControls}
        mode={mode}
        showX={showX}
        showY={showY}
        showZ={showZ}
      >
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
  decorators: [withKnobs, (storyFn) => <Setup controls={false} >{storyFn()}</Setup>],
}
