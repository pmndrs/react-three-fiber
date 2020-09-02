import React from 'react'
import { withKnobs, number } from '@storybook/addon-knobs'

import { Setup } from '../Setup'

import { Sky } from '../../src/shaders/Sky'
import { Plane } from '../../src/shapes'

export default {
  title: 'Shaders/Sky',
  component: Sky,
  decorators: [withKnobs, (storyFn) => <Setup> {storyFn()}</Setup>],
}

function SkyScene() {
  return (
    <>
      <Sky />
      <Plane rotation-x={Math.PI / 2} args={[100, 100, 4, 4]}>
        <meshBasicMaterial color="black" wireframe attach="material" />
      </Plane>
      <axesHelper />
    </>
  )
}

export const SkySt = () => <SkyScene />
SkySt.storyName = 'Default'

function SkyScene2() {
  return (
    <>
      <Sky 
        distance={3000} 
        turbidity={number('Turbidity', 8, { range: true, max: 10, step: 0.1 })} 
        rayleigh={number('Rayleigh', 6, { range: true, max: 10, step: 0.1 })} 
        sunPosition={[Math.PI, 0, 0]}
        />
      <Plane rotation-x={Math.PI / 2} args={[100, 100, 4, 4]}>
        <meshBasicMaterial color="black" wireframe attach="material" />
      </Plane>
      <axesHelper />
    </>
  )
}

export const SkySt2 = () => <SkyScene2 />
SkySt2.storyName = 'Another one'
