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

  it('should forward ref three object', async () => {
    const r = React.createRef<THREE.Mesh>()
    const ref = React.useRef<THREE.Object3D>()
    const refSpecific = React.useRef<THREE.Mesh | null>(null)

    // Note: Passing directly should be less strict, and assigning current should be more strict
    await act(async () => {
      render(
        <>
          <mesh ref={ref} />
          <mesh ref={refSpecific} />
          <mesh ref={(r) => (refSpecific.current = r)} />
        </>,
      )
    })

    expect(r.current).toBeTruthy()
    expect(ref.current).toBeTruthy()
    expect(refSpecific.current).toBeTruthy()
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
