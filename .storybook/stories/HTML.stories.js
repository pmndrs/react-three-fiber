import React from 'react'

import { Setup } from '../Setup'

import { Icosahedron } from '../../src/shapes'
import { HTML } from '../../src/HTML'
import { useTurntable } from '../useTurntable'

export default {
  title: 'Abstractions.HTML',
  component: HTML,
  decorators: [(storyFn) => <Setup cameraPosition={[-20, 20, -20]}> {storyFn()}</Setup>],
}

function HTMLScene() {
  const ref = useTurntable()
  return (
    <group ref={ref}>
      <Icosahedron args={[2, 2]} position={[3, 6, 4]}>
        <meshBasicMaterial attach="material" color="hotpink" wireframe />
        <HTML scaleFactor={30} className="html-story-block">
          First
        </HTML>
      </Icosahedron>

      <Icosahedron args={[2, 2]} position={[10, 0, 10]}>
        <meshBasicMaterial attach="material" color="hotpink" wireframe />
        <HTML scaleFactor={30} className="html-story-block">
          Second
        </HTML>
      </Icosahedron>

      <Icosahedron args={[2, 2]} position={[-10, 0, -10]}>
        <meshBasicMaterial attach="material" color="hotpink" wireframe />
        <HTML scaleFactor={30} className="html-story-block">
          Third
        </HTML>
      </Icosahedron>
    </group>
  )
}

export const HTMLSt = () => <HTMLScene />
HTMLSt.storyName = 'Default'
