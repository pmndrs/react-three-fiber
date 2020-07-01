import React from 'react'

import { Setup } from '../Setup'

import { Detailed } from '../../src/Detailed'
import { Icosahedron } from '../../src/shapes'
import { OrbitControls } from '../../src/OrbitControls'

export default {
  title: 'Abstractions.Detailed',
  component: Detailed,
  decorators: [
    (storyFn) => (
      <Setup controls={false} cameraPosition={[0, 0, 100]}>
        {' '}
        {storyFn()}
      </Setup>
    ),
  ],
}

function DetailedScene() {
  return (
    <>
      <Detailed distances={[0, 50, 150]}>
        <Icosahedron args={[10, 3]}>
          <meshBasicMaterial attach="material" color="hotpink" wireframe />
        </Icosahedron>
        <Icosahedron args={[10, 2]}>
          <meshBasicMaterial attach="material" color="lightgreen" wireframe />
        </Icosahedron>
        <Icosahedron args={[10, 1]}>
          <meshBasicMaterial attach="material" color="lightblue" wireframe />
        </Icosahedron>
      </Detailed>
      <OrbitControls enablePan={false} enableRotate={false} zoomSpeed={0.5} />
    </>
  )
}

export const DetailedSt = () => <DetailedScene />
DetailedSt.storyName = 'Default'
