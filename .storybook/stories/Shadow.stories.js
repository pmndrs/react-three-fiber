import React, { useRef } from 'react'
import { useFrame } from 'react-three-fiber'

import { Setup } from '../Setup'

import { Shadow } from '../../src/Shadow'
import { Icosahedron, Plane } from '../../src/shapes'

export default {
  title: 'Misc.Shadow',
  component: Shadow,
  decorators: [(storyFn) => <Setup> {storyFn()}</Setup>],
}

function ShadowScene() {
  const shadow = useRef()
  const mesh = useRef()

  useFrame(({ clock }) => {
    shadow.current.scale.x = Math.sin(clock.getElapsedTime()) + 3
    shadow.current.scale.y = Math.sin(clock.getElapsedTime()) + 3

    mesh.current.position.y = Math.sin(clock.getElapsedTime()) + 2.5
  })

  return (
    <>
      <Icosahedron ref={mesh} args={[1, 2]} position-y={2}>
        <meshBasicMaterial attach="material" color="lightblue" wireframe />
      </Icosahedron>
      <Shadow ref={shadow} scale={[2, 2, 2]} position-y={0.1} rotation-x={-Math.PI / 2} />

      <Plane args={[4, 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial attach="material" color="white" />
      </Plane>
    </>
  )
}

export const ShadowSt = () => <ShadowScene />
ShadowSt.storyName = 'Default'
