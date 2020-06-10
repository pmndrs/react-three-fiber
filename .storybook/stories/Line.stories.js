import React from 'react'
import { GeometryUtils } from 'three/examples/jsm/utils/GeometryUtils'
import { Vector3 } from 'three'

import { withKnobs, number, color } from '@storybook/addon-knobs'

import { Setup } from '../Setup'

import { Line } from '../../src/Line'
import { OrbitControls } from '../../src/OrbitControls'

export default {
  title: 'Abstractions.Line',
  component: Line,
}

const points = GeometryUtils.hilbert3D(new Vector3(0), 5).map((p) => [p.x, p.y, p.z])
const colors = new Array(points.length).fill().map(() => [Math.random(), Math.random(), Math.random()])

export function BasicLine() {
  return (
    <>
      <Line points={points} color={color('color', 'red')} linewidth={number('linewidth', 3)} />
      <OrbitControls zoomSpeed={0.5} />
    </>
  )
}
BasicLine.story = {
  name: 'Basic',
  decorators: [
    withKnobs,
    (storyFn) => (
      <Setup controls={false} cameraPosition={[0, 0, 17]}>
        {storyFn()}
      </Setup>
    ),
  ],
}

export function VertexColorsLine() {
  return (
    <>
      <Line points={points} color={color('color', 'white')} vertexColors={colors} linewidth={number('linewidth', 3)} />
      <OrbitControls zoomSpeed={0.5} />
    </>
  )
}
VertexColorsLine.story = {
  name: 'VertexColors',
  decorators: [
    withKnobs,
    (storyFn) => (
      <Setup controls={false} cameraPosition={[0, 0, 17]}>
        {storyFn()}
      </Setup>
    ),
  ],
}
