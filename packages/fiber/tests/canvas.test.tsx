import React from 'react'
import { render } from '@testing-library/react'
import { Canvas, act } from '../src'

describe('web Canvas', () => {
  it('should correctly mount', async () => {
    const renderer = await act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(renderer.container).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<HTMLCanvasElement>()

    await act(async () =>
      render(
        <Canvas ref={ref}>
          <group />
        </Canvas>,
      ),
    )

    expect(ref.current).toBeInstanceOf(HTMLCanvasElement)
  })

  it('should forward context', async () => {
    const ParentContext = React.createContext<boolean>(null!)
    let receivedValue!: boolean

    function Test() {
      receivedValue = React.useContext(ParentContext)
      return null
    }

    await act(async () => {
      render(
        <ParentContext.Provider value={true}>
          <Canvas>
            <Test />
          </Canvas>
        </ParentContext.Provider>,
      )
    })

    expect(receivedValue).toBe(true)
  })

  it('should correctly unmount', async () => {
    const renderer = await act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(() => renderer.unmount()).not.toThrow()
  })

  it('plays nice with react SSR', async () => {
    const useLayoutEffect = jest.spyOn(React, 'useLayoutEffect')

    await act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(useLayoutEffect).not.toHaveBeenCalled()
  })

  it('should use manual width and height when provided', async () => {
    const renderer = await act(async () =>
      render(
        <Canvas width={640} height={480}>
          <group />
        </Canvas>,
      ),
    )

    const canvas = renderer.container.querySelector('canvas')
    expect(canvas?.getAttribute('width')).toBe('640')
    expect(canvas?.getAttribute('height')).toBe('480')
  })

  it('should fallback to useMeasure when only width is provided', async () => {
    const renderer = await act(async () =>
      render(
        <Canvas width={640}>
          <group />
        </Canvas>,
      ),
    )

    const canvas = renderer.container.querySelector('canvas')
    // Should use mocked useMeasure dimensions (1280x800)
    expect(canvas?.getAttribute('width')).toBe('1280')
    expect(canvas?.getAttribute('height')).toBe('800')
  })

  it('should fallback to useMeasure when only height is provided', async () => {
    const renderer = await act(async () =>
      render(
        <Canvas height={480}>
          <group />
        </Canvas>,
      ),
    )

    const canvas = renderer.container.querySelector('canvas')
    // Should use mocked useMeasure dimensions (1280x800)
    expect(canvas?.getAttribute('width')).toBe('1280')
    expect(canvas?.getAttribute('height')).toBe('800')
  })

  it('should fallback to useMeasure when neither width nor height is provided', async () => {
    const renderer = await act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    const canvas = renderer.container.querySelector('canvas')
    // Should use mocked useMeasure dimensions (1280x800)
    expect(canvas?.getAttribute('width')).toBe('1280')
    expect(canvas?.getAttribute('height')).toBe('800')
  })
})
