import React, { act } from 'react'
import { render } from '@testing-library/react'
import { Canvas, RootState } from '../src'

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

  it('should survive a StrictMode remount', async () => {
    jest.useFakeTimers()

    try {
      let state!: RootState
      await act(async () =>
        render(
          <React.StrictMode>
            <Canvas onCreated={(created) => (state = created)}>
              <group />
            </Canvas>
          </React.StrictMode>,
        ),
      )

      // StrictMode already remounted the Canvas into the same root; the
      // teardown deferred by the simulated unmount must not fire on it.
      const forceContextLoss = jest.spyOn(state.gl, 'forceContextLoss')
      await act(async () => void jest.advanceTimersByTime(1000))

      expect(forceContextLoss).not.toHaveBeenCalled()
      expect(state.get().internal.active).toBe(true)
    } finally {
      jest.useRealTimers()
    }
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
})
