jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'
import { render, RenderResult } from '@testing-library/react'
import { createWebGLContext } from 'react-three-test-renderer/src/createWebGLContext'

import { Canvas, testutil_act as r3fAct } from '../../src/web'

// @ts-ignore
HTMLCanvasElement.prototype.getContext = function () {
  return createWebGLContext(this)
}

describe('web Canvas', () => {
  it('should correctly mount', async () => {
    let renderer: RenderResult = null!

    await r3fAct(async () => {
      renderer = render(
        <Canvas>
          <group />
        </Canvas>,
      )
    })

    expect(renderer.container).toMatchSnapshot()
  })

  it('should correctly unmount', async () => {
    let renderer: RenderResult = null!

    await r3fAct(async () => {
      renderer = render(
        <Canvas>
          <group />
        </Canvas>,
      )
    })

    expect(() => renderer.unmount()).not.toThrow()
  })
})
