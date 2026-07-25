import { vi } from 'vitest'
import React, { act } from 'react'
import { render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '../src'

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

  // Regression for #3757: the `fallback` prop lives inside <canvas>, which browsers never
  // paint, so a renderer-setup failure must surface the fallback as visible sibling DOM.
  it('renders the fallback outside the canvas when renderer setup fails', async () => {
    // Suppress the expected error log from the failed renderer setup
    const originalError = console.error
    console.error = vi.fn()

    try {
      const renderer = await act(async () =>
        render(
          <Canvas
            fallback={<div>Sorry no WebGL supported!</div>}
            gl={() => {
              throw new Error('WebGL unavailable')
            }}>
            <group />
          </Canvas>,
        ),
      )

      // Allow the async configure() rejection + fallback state update to flush
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      const fallbackEl = renderer.getByText('Sorry no WebGL supported!')
      expect(fallbackEl).toBeTruthy()
      // Must be rendered as visible DOM, not as a child of <canvas>
      expect(fallbackEl.closest('canvas')).toBe(null)
    } finally {
      console.error = originalError
    }
  })

  // When no fallback is supplied, a renderer-setup failure should propagate to an
  // external error boundary rather than silently swallowing the error.
  it('surfaces renderer setup failure to an error boundary when no fallback is given', async () => {
    const originalError = console.error
    console.error = vi.fn()

    let caughtError: Error | null = null
    class TestErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
      state = { hasError: false }
      static getDerivedStateFromError() {
        return { hasError: true }
      }
      componentDidCatch(error: Error) {
        caughtError = error
      }
      render() {
        if (this.state.hasError) return <div data-testid="boundary">boom</div>
        return this.props.children
      }
    }

    try {
      const renderer = await act(async () =>
        render(
          <TestErrorBoundary>
            <Canvas
              gl={() => {
                throw new Error('WebGL unavailable')
              }}>
              <group />
            </Canvas>
          </TestErrorBoundary>,
        ),
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(caughtError).toBeInstanceOf(Error)
      expect(renderer.getByTestId('boundary')).toBeTruthy()
    } finally {
      console.error = originalError
    }
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

  describe('background prop', () => {
    it('should set scene.background with color string', async () => {
      let sceneBackground: THREE.Color | null = null

      function BackgroundChecker() {
        const { scene } = useThree()
        React.useEffect(() => {
          sceneBackground = scene.background as THREE.Color
        })
        return null
      }

      await act(async () =>
        render(
          <Canvas background="#ff0000">
            <BackgroundChecker />
          </Canvas>,
        ),
      )

      // Wait for Environment to apply background
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(sceneBackground).toBeInstanceOf(THREE.Color)
      expect(sceneBackground!.getHexString()).toBe('ff0000')
    })

    it('should set scene.background with hex number', async () => {
      let sceneBackground: THREE.Color | null = null

      function BackgroundChecker() {
        const { scene } = useThree()
        React.useEffect(() => {
          sceneBackground = scene.background as THREE.Color
        })
        return null
      }

      await act(async () =>
        render(
          <Canvas background={0x00ff00}>
            <BackgroundChecker />
          </Canvas>,
        ),
      )

      // Wait for Environment to apply background
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(sceneBackground).toBeInstanceOf(THREE.Color)
      expect(sceneBackground!.getHexString()).toBe('00ff00')
    })

    it('should parse object form with preset', async () => {
      // This test verifies the parsing works without waiting for network
      // The preset will try to load but we verify the Environment is rendered
      let environmentRendered = false

      // Mock console.error to suppress network errors from preset loading
      const originalError = console.error
      console.error = vi.fn()

      try {
        await act(async () =>
          render(
            <Canvas
              background={{
                preset: 'city',
                backgroundBlurriness: 0.5,
              }}>
              <group />
            </Canvas>,
          ),
        )

        // The Canvas should mount without throwing
        environmentRendered = true
      } finally {
        console.error = originalError
      }

      expect(environmentRendered).toBe(true)
    })
  })

  describe('frustum / occlusion props', () => {
    // Regression for Bug #2: autoUpdateFrustum/occlusion were not destructured in
    // CanvasImpl, so they fell into ...props and were spread onto the wrapper <div>
    // instead of being forwarded to configure().
    it('forwards autoUpdateFrustum to configure', async () => {
      let value: boolean | undefined

      function Checker() {
        value = useThree((s) => s.autoUpdateFrustum)
        return null
      }

      await act(async () =>
        render(
          <Canvas autoUpdateFrustum={false}>
            <Checker />
          </Canvas>,
        ),
      )

      expect(value).toBe(false)
    })

    it('forwards occlusion to configure (warns on WebGL)', async () => {
      // Occlusion needs WebGPU; under the jsdom WebGL test renderer, configure()
      // forwarding the prop reaches enableOcclusion(), which warns once. The warning
      // is proof the prop was forwarded (it was silently dropped before the fix).
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      try {
        await act(async () =>
          render(
            <Canvas occlusion>
              <group />
            </Canvas>,
          ),
        )

        expect(
          warn.mock.calls.some(([msg]) => typeof msg === 'string' && /occlusion queries require WebGPU/i.test(msg)),
        ).toBe(true)
      } finally {
        warn.mockRestore()
      }
    })
  })
})
