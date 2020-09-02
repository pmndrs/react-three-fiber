import React from 'react'
import { GeometryUtils } from 'three/examples/jsm/utils/GeometryUtils'
import { Vector3 } from 'three'

import { withKnobs, number, color } from '@storybook/addon-knobs'

import { Setup } from '../Setup'

import { Line } from '../../src/abstractions/Line'
import { OrbitControls } from '../../src/controls/OrbitControls'

export default {
  title: 'Abstractions/Line',
  component: Line,
}

const points = GeometryUtils.hilbert3D(new Vector3(0), 5).map((p) => [p.x, p.y, p.z])
const colors = new Array(points.length).fill().map(() => [Math.random(), Math.random(), Math.random()])

export function BasicLine() {
  return (
    <>
      <Line points={points} color={color('color', 'red')} lineWidth={number('lineWidth', 3)} />
      <OrbitControls zoomSpeed={0.5} />
    </>
  )
}
BasicLine.storyName = 'Basic'

BasicLine.decorators = [
  withKnobs,
  (storyFn) => (
    <Setup controls={false} cameraPosition={[0, 0, 17]}>
      {storyFn()}
    </Setup>
  ),
]

export function VertexColorsLine() {
  return (
    <>
      <Line points={points} color={color('color', 'white')} vertexColors={colors} lineWidth={number('lineWidth', 3)} />
      <OrbitControls zoomSpeed={0.5} />
    </>
  )
}
VertexColorsLine.storyName = 'VertexColors'

VertexColorsLine.decorators = [
  withKnobs,
  (storyFn) => (
    <Setup controls={false} cameraPosition={[0, 0, 17]}>
      {storyFn()}
    </Setup>
  ),
]
