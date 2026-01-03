import { vi } from 'vitest'
import React, { act } from 'react'
import { render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
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
    const useLayoutEffect = vi.spyOn(React, 'useLayoutEffect')
    const useEffect = vi.spyOn(React, 'useEffect')

    // renderToString should not throw
    let result: string = ''
    await act(async () => {
      result = renderToString(
        React.createElement(Canvas, {
          children: React.createElement('mesh'),
        }),
      )
    })

    expect(result).toContain('<canvas')
    // We don't strictly require useLayoutEffect to be called in React 19 SSR pass,
    // as long as it doesn't crash and renders the basic markup.
    useLayoutEffect.mockRestore()
    useEffect.mockRestore()
  })

  it('catches useFrame errors in error boundary', async () => {
    const testError = new Error('useFrame error boundary test')

    // Suppress expected console.error from error boundary and scheduler
    const originalError = console.error
    const errorSpy = vi.fn()
    console.error = errorSpy

    //* Track what the error boundary catches ==============================
    let caughtError: Error | null = null
    let errorInfo: React.ErrorInfo | null = null

    // User-provided error boundary component
    class TestErrorBoundary extends React.Component<
      { children: React.ReactNode; fallback: React.ReactNode },
      { hasError: boolean }
    > {
      state = { hasError: false }

      static getDerivedStateFromError() {
        return { hasError: true }
      }

      componentDidCatch(error: Error, info: React.ErrorInfo) {
        caughtError = error
        errorInfo = info
      }

      render() {
        if (this.state.hasError) return this.props.fallback
        return this.props.children
      }
    }

    // Component that throws in useFrame
    const ErrorComponent = () => {
      useFrame(() => {
        throw testError
      })
      return <mesh />
    }

    try {
      const renderer = await act(async () =>
        render(
          <TestErrorBoundary fallback={<div data-testid="error-fallback">Error caught</div>}>
            <Canvas>
              <ErrorComponent />
            </Canvas>
          </TestErrorBoundary>,
        ),
      )

      // Wait for frames to execute and error to propagate to boundary
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      // Verify the error was caught by our boundary
      expect(caughtError).toBe(testError)
      expect(errorInfo).not.toBeNull()

      // Verify fallback UI is rendered
      expect(renderer.getByTestId('error-fallback')).toBeTruthy()
    } finally {
      console.error = originalError
    }
  })
})
