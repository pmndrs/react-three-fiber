jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'
import { render, RenderResult } from '@testing-library/react'
import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'

import { Canvas, act, useThree } from '../../src/web'

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

  it('should render with vr prop set', async () => {
    let xrEnabled = false

    const Component = () => {
      const gl = useThree((state) => state.gl)
      xrEnabled = gl.xr.enabled
      return null
    }

    await act(async () => {
      render(
        <Canvas vr={true}>
          <Component />
        </Canvas>,
      )
    })

    expect(xrEnabled).toBe(true)
  })
})
