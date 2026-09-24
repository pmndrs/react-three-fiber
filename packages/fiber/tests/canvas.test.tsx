import React, { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import { Canvas, RootState } from '../src'

// CI also covers React 19.0, which has neither Activity nor its types.
const Activity = (
  React as unknown as {
    Activity: React.ComponentType<React.PropsWithChildren<{ mode: 'visible' | 'hidden' }>>
  }
).Activity
const describeActivity = Activity ? describe : describe.skip
const testActivity = Activity ? it : it.skip

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
    const forceContextLoss = jest.fn()
    let state!: RootState

    const renderer = await act(async () =>
      render(
        <React.StrictMode>
          <Canvas
            gl={(props) => {
              const gl = new THREE.WebGLRenderer(props)
              jest.spyOn(gl, 'forceContextLoss').mockImplementation(forceContextLoss)
              return gl
            }}
            onCreated={(created) => (state = created)}>
            <group />
          </Canvas>
        </React.StrictMode>,
      ),
    )

    expect(forceContextLoss).not.toHaveBeenCalled()
    expect(state.get().internal.active).toBe(true)
    expect(state.scene.children).toHaveLength(1)

    await act(async () => renderer.unmount())
    expect(forceContextLoss).toHaveBeenCalledTimes(1)
    expect(state.get().internal.active).toBe(false)
  })

  describeActivity.each([
    ['default', React.Fragment],
    ['StrictMode', React.StrictMode],
  ] as const)('Activity (%s)', (_, Wrapper) => {
    it('preserves the renderer and scene state across hide and show', async () => {
      let state!: RootState
      function Scene() {
        const [object] = React.useState(() => new THREE.Group())
        return <primitive object={object} />
      }
      const App = ({ mode }: { mode: 'visible' | 'hidden' }) => (
        <Wrapper>
          <Activity mode={mode}>
            <Canvas frameloop="never" onCreated={(created) => (state = created)}>
              <Scene />
            </Canvas>
          </Activity>
        </Wrapper>
      )

      const renderer = await act(async () => render(<App mode="visible" />))
      const gl = state.gl
      const object = state.scene.children[0]
      const dispose = jest.spyOn(gl, 'dispose')
      const forceContextLoss = jest.spyOn(gl, 'forceContextLoss')

      await act(async () => renderer.rerender(<App mode="hidden" />))
      expect(dispose).not.toHaveBeenCalled()
      expect(forceContextLoss).not.toHaveBeenCalled()

      await act(async () => renderer.rerender(<App mode="visible" />))
      expect(state.gl).toBe(gl)
      expect(state.scene.children).toHaveLength(1)
      expect(state.scene.children[0]).toBe(object)
      expect(dispose).not.toHaveBeenCalled()
      expect(forceContextLoss).not.toHaveBeenCalled()

      await act(async () => renderer.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
    })

    it('disposes the renderer when removed while hidden', async () => {
      let gl!: THREE.WebGLRenderer
      const App = ({ mode }: { mode: 'visible' | 'hidden' }) => (
        <Wrapper>
          <Activity mode={mode}>
            <Canvas frameloop="never" gl={(props) => (gl = new THREE.WebGLRenderer(props))}>
              <group />
            </Canvas>
          </Activity>
        </Wrapper>
      )

      const renderer = await act(async () => render(<App mode="visible" />))
      const dispose = jest.spyOn(gl, 'dispose')
      const forceContextLoss = jest.spyOn(gl, 'forceContextLoss')

      await act(async () => renderer.rerender(<App mode="hidden" />))
      expect(dispose).not.toHaveBeenCalled()
      expect(forceContextLoss).not.toHaveBeenCalled()

      await act(async () => renderer.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
    })
  })

  it('tears down a canvas that unmounts as it mounts', async () => {
    const forceContextLoss = jest.fn()
    let connected: unknown

    // A layout effect in the parent unmounts the canvas within the same commit
    function Parent() {
      const [mounted, setMounted] = React.useState(true)
      React.useLayoutEffect(() => setMounted(false), [])
      return mounted ? (
        <Canvas
          gl={(props) => {
            const gl = new THREE.WebGLRenderer(props)
            jest.spyOn(gl, 'forceContextLoss').mockImplementation(forceContextLoss)
            return gl
          }}
          onCreated={(created) => (connected = created.get().events.connected)}>
          <group />
        </Canvas>
      ) : null
    }

    await act(async () => render(<Parent />))

    expect(connected).toBeInstanceOf(HTMLDivElement)
    expect(forceContextLoss).toHaveBeenCalledTimes(1)
  })

  it('resumes a scene after its Suspense boundary resolves', async () => {
    let resolve!: () => void
    const ready = new Promise<void>((done) => (resolve = done))
    let state!: RootState
    function Scene() {
      React.use(ready)
      return <group />
    }
    const renderer = await act(async () =>
      render(
        <React.Suspense fallback={<div data-testid="loading" />}>
          <Canvas frameloop="never" onCreated={(created) => (state = created)}>
            <Scene />
          </Canvas>
        </React.Suspense>,
      ),
    )
    expect(renderer.queryByTestId('loading')).not.toBeNull()
    const gl = state.gl
    const dispose = jest.spyOn(gl, 'dispose')

    await act(async () => resolve())
    expect(renderer.queryByTestId('loading')).toBeNull()
    expect(state.gl).toBe(gl)
    expect(state.scene.children).toHaveLength(1)
    expect(dispose).not.toHaveBeenCalled()

    await act(async () => renderer.unmount())
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('releases the renderer when removed while its scene loads', async () => {
    let gl!: THREE.WebGLRenderer
    const loading = new Promise<void>(() => {})
    function Scene() {
      React.use(loading)
      return <group />
    }
    const renderer = await act(async () =>
      render(
        <React.Suspense fallback={<div data-testid="loading" />}>
          <Canvas frameloop="never" gl={(props) => (gl = new THREE.WebGLRenderer(props))}>
            <Scene />
          </Canvas>
        </React.Suspense>,
      ),
    )
    expect(renderer.queryByTestId('loading')).not.toBeNull()
    const forceContextLoss = jest.spyOn(gl, 'forceContextLoss')

    await act(async () => renderer.unmount())
    expect(forceContextLoss).toHaveBeenCalledTimes(1)
  })

  it('connects to an eventSource ref on an ancestor', async () => {
    const ref = React.createRef<HTMLDivElement>()
    let state!: RootState

    await act(async () =>
      render(
        <div ref={ref}>
          <Canvas eventSource={ref} eventPrefix="client" onCreated={(created) => (state = created)}>
            <group />
          </Canvas>
        </div>,
      ),
    )

    expect(state.get().events.connected).toBe(ref.current)
  })

  describe('with an async renderer', () => {
    it('mounts once the renderer resolves', async () => {
      let ready!: () => void
      let state!: RootState

      await act(async () =>
        render(
          <Canvas
            gl={async (props) => {
              await new Promise<void>((resolve) => (ready = resolve))
              return new THREE.WebGLRenderer(props)
            }}
            onCreated={(created) => (state = created)}>
            <group />
          </Canvas>,
        ),
      )
      expect(state).toBeUndefined()

      await act(async () => ready())
      expect(state.scene.children).toHaveLength(1)
      expect(state.get().events.connected).toBeInstanceOf(HTMLDivElement)
    })

    testActivity('retains a renderer that resolves while hidden and mounts the scene when shown', async () => {
      let ready!: () => void
      let gl!: THREE.WebGLRenderer
      const onCreated = jest.fn()
      const createRenderer = jest.fn(async (props) => {
        await new Promise<void>((resolve) => (ready = resolve))
        return (gl = new THREE.WebGLRenderer(props))
      })
      const App = ({ mode }: { mode: 'visible' | 'hidden' }) => (
        <Activity mode={mode}>
          <Canvas gl={createRenderer} onCreated={onCreated} frameloop="never">
            <group />
          </Canvas>
        </Activity>
      )
      const renderer = await act(async () => render(<App mode="visible" />))
      await act(async () => renderer.rerender(<App mode="hidden" />))
      await act(async () => ready())
      expect(onCreated).not.toHaveBeenCalled()

      const dispose = jest.spyOn(gl, 'dispose')
      await act(async () => renderer.rerender(<App mode="visible" />))
      expect(onCreated).toHaveBeenCalledTimes(1)
      expect(createRenderer).toHaveBeenCalledTimes(1)
      expect(onCreated.mock.calls[0][0].gl).toBe(gl)
      expect(onCreated.mock.calls[0][0].scene.children).toHaveLength(1)
      expect(dispose).not.toHaveBeenCalled()

      await act(async () => renderer.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
    })

    it('never mounts when the canvas unmounts while the renderer is pending', async () => {
      const forceContextLoss = jest.fn()
      const onCreated = jest.fn()
      let ready!: () => void

      const renderer = await act(async () =>
        render(
          <Canvas
            gl={async (props) => {
              await new Promise<void>((resolve) => (ready = resolve))
              const gl = new THREE.WebGLRenderer(props)
              jest.spyOn(gl, 'forceContextLoss').mockImplementation(forceContextLoss)
              return gl
            }}
            onCreated={onCreated}>
            <group />
          </Canvas>,
        ),
      )
      await act(async () => renderer.unmount())
      await act(async () => ready())

      expect(onCreated).not.toHaveBeenCalled()
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
    })

    it('surfaces a failed renderer to the nearest error boundary', async () => {
      const error = new Error('no renderer')
      let caught: unknown

      class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
        state = { failed: false }
        static getDerivedStateFromError = () => ({ failed: true })
        componentDidCatch(err: unknown) {
          caught = err
        }
        render() {
          return this.state.failed ? null : this.props.children
        }
      }

      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      try {
        await act(async () =>
          render(
            <Boundary>
              <Canvas gl={async () => Promise.reject(error)}>
                <group />
              </Canvas>
            </Boundary>,
          ),
        )
      } finally {
        consoleError.mockRestore()
      }

      expect(caught).toBe(error)
    })
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
