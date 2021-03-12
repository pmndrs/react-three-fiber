jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'

import ReactThreeTestRenderer from '../index'

describe('ReactThreeTestRenderer Events', () => {
  it('should fire an event', async () => {
    const handlePointerDown = jest.fn()

    const Component = () => {
      return (
        <mesh position-x={1} onPointerDown={handlePointerDown}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const { scene, fireEvent } = await ReactThreeTestRenderer.create(<Component />)

    await fireEvent(scene.children[0], 'onPointerDown')

    expect(handlePointerDown).toBeCalled()
  })
})
