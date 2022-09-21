// use default export for jest.spyOn
import React from 'react'
import { render, RenderResult } from '@testing-library/react'

import { Canvas, act } from '../../src'

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

  it('plays nice with react SSR', async () => {
    const useLayoutEffect = jest.spyOn(React, 'useLayoutEffect')

    await act(async () => {
      render(
        <Canvas>
          <group />
        </Canvas>,
      )
    })

    expect(useLayoutEffect).not.toHaveBeenCalled()
  })
})
