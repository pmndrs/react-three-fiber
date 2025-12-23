import React, { act } from 'react'
import { render } from '@testing-library/react'
import { Canvas, useFrame } from '../src'

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

  it('catches useFrame errors in error boundary', async () => {
    const testError = new Error('useFrame error boundary test')

    // Suppress expected console.error from error boundary and scheduler
    const originalError = console.error
    const errorSpy = jest.fn()
    console.error = errorSpy

    const ErrorComponent = () => {
      useFrame(() => {
        throw testError
      })
      return <mesh />
    }

    try {
      // Test that error is set in store and propagated to Canvas error boundary
      const renderer = await act(async () =>
        render(
          <Canvas>
            <ErrorComponent />
          </Canvas>,
        ),
      )

      // Wait for frames to execute and error to be thrown
      // Wrap in try-catch since React may re-throw after error boundary catches
      try {
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 150))
        })
      } catch (err) {
        // Expected - error may be re-thrown by React after boundary catches it
      }

      // Verify the scheduler error handler was called
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[Scheduler] Error in job'), testError)

      // Canvas should still be mounted (error boundary prevents unmount)
      expect(renderer.container).toBeTruthy()
    } finally {
      // Restore console.error
      console.error = originalError
    }
  })
})
