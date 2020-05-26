import React from 'react'
import { linkTo } from '@storybook/addon-links'
import { Canvas, useFrame } from 'react-three-fiber'

import { TransformControls } from '../src/TransformControls'
import { Box } from '../src/shapes'

import '../.storybook/index.css'

function Setup({ children }) {
  return (
    <Canvas colorManagement shadowMap camera={{ position: [-5, 5, 5] }} pixelRatio={window.devicePixelRatio}>
      {children}
      <ambientLight intensity={0.8} />
      <pointLight intensity={1} color={'ffffff'} position={[0, 6, 0]} />
    </Canvas>
  )
}

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
  title: 'TransformControls',
  component: TransformControls,
  decorators: [(storyFn) => <Setup>{storyFn()}</Setup>],
}
