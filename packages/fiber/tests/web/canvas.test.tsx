jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'
import { render, RenderResult } from '@testing-library/react'
import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'

import { Canvas, act } from '../../src'

// @ts-ignore
HTMLCanvasElement.prototype.getContext = function () {
  return createWebGLContext(this)
}

describe('web Canvas', () => {
  it('should correctly mount', async () => {
    let renderer: RenderResult = null!
    await act(async () => {
      renderer = render(
        <Canvas>
          <group />
        </Canvas>,
      )
    })

    expect(renderer.container).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<HTMLCanvasElement>()

    await act(async () => {
      render(
        <Canvas ref={ref}>
          <group />
        </Canvas>,
      )
    })

    expect(ref.current).toBeDefined()
  })

  it('should correctly unmount', async () => {
    let renderer: RenderResult = null!
    await act(async () => {
      renderer = render(
        <Canvas>
          <group />
        </Canvas>,
      )
    })

    expect(() => renderer.unmount()).not.toThrow()
  })
})
