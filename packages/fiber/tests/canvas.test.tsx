import React, { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import { Canvas, RootState, RootStore, useStore, useThree } from '../src'
import * as measure from 'react-use-measure'

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

  it('updates children without restoring unchanged configuration props', async () => {
    let state!: RootState
    const App = ({ name, changed = false }: { name: string; changed?: boolean }) => (
      <Canvas
        shadows={{ type: changed ? THREE.VSMShadowMap : THREE.PCFShadowMap }}
        dpr={changed ? 2 : [1, 2]}
        frameloop={changed ? 'always' : 'never'}
        performance={{ min: changed ? 0.3 : 0.5 }}
        onCreated={(created) => (state = created)}>
        <group name={name} />
      </Canvas>
    )
    const renderer = await act(async () => render(<App name="initial" />))
    await act(async () => {
      state.setDpr(0.5)
      state.setFrameloop('demand')
      state.set((current) => ({ performance: { ...current.performance, min: 0.2 } }))
      state.gl.shadowMap.type = THREE.BasicShadowMap
    })
    state.gl.shadowMap.needsUpdate = false

    await act(async () => renderer.rerender(<App name="updated" />))
    expect(state.scene.children[0].name).toBe('updated')
    expect(state.get().viewport.dpr).toBe(0.5)
    expect(state.get().frameloop).toBe('demand')
    expect(state.get().performance.min).toBe(0.2)
    expect(state.gl.shadowMap.type).toBe(THREE.BasicShadowMap)
    expect(state.gl.shadowMap.needsUpdate).toBe(false)

    await act(async () => renderer.rerender(<App name="changed props" changed />))
    expect(state.get().viewport.dpr).toBe(2)
    expect(state.get().frameloop).toBe('always')
    expect(state.get().performance.min).toBe(0.3)
    expect(state.gl.shadowMap.type).toBe(THREE.VSMShadowMap)
    await act(async () => renderer.unmount())
  })

  describe('rerendering', () => {
    afterEach(() => jest.restoreAllMocks())

    it('calls the latest onPointerMissed without publishing store updates', async () => {
      const missed = jest.fn()
      let store!: RootStore
      function Scene({ name }: { name: string }) {
        store = useStore()
        return <group name={name} />
      }
      const App = ({ name }: { name: string }) => (
        <Canvas shadows frameloop="never" onPointerMissed={() => missed(name)}>
          <Scene name={name} />
        </Canvas>
      )
      const renderer = await act(async () => render(<App name="initial" />))
      const listener = jest.fn()
      const unsubscribe = store.subscribe(listener)

      await act(async () => renderer.rerender(<App name="updated" />))
      expect(store.getState().scene.children[0].name).toBe('updated')
      store.getState().onPointerMissed?.(new MouseEvent('click'))
      expect(missed).toHaveBeenCalledWith('updated')
      expect(listener).not.toHaveBeenCalled()
      unsubscribe()
      await act(async () => renderer.unmount())
    })

    it('forwards context updates to stable children', async () => {
      const Context = React.createContext('initial')
      let state!: RootState
      function Scene() {
        return <group name={React.useContext(Context)} />
      }
      const children = <Scene />
      const App = ({ value }: { value: string }) => (
        <Context.Provider value={value}>
          <Canvas frameloop="never" onCreated={(created) => (state = created)}>
            {children}
          </Canvas>
        </Context.Provider>
      )
      const renderer = await act(async () => render(<App value="initial" />))
      await act(async () => renderer.rerender(<App value="updated" />))
      expect(state.scene.children[0].name).toBe('updated')
      await act(async () => renderer.unmount())
    })

    it('updates measured bounds without resetting runtime values', async () => {
      let bounds = { width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100, x: 0, y: 0 }
      jest.spyOn(measure, 'default').mockImplementation(() => [() => {}, bounds, () => {}])
      let state!: RootState
      const App = () => <Canvas shadows frameloop="never" onCreated={(created) => (state = created)} />
      const renderer = await act(async () => render(<App />))
      await act(async () => {
        state.setDpr(0.5)
        state.setFrameloop('demand')
        state.gl.shadowMap.type = THREE.BasicShadowMap
      })
      const resize = jest.spyOn(state.gl, 'setSize')

      bounds = { ...bounds, top: 20, left: 10 }
      await act(async () => renderer.rerender(<App />))
      expect(state.get().size).toEqual({ width: 100, height: 100, top: 20, left: 10 })
      expect(resize).not.toHaveBeenCalled()
      bounds = { ...bounds, width: 200 }
      await act(async () => renderer.rerender(<App />))
      expect(state.gl.getSize(new THREE.Vector2())).toEqual(new THREE.Vector2(200, 100))
      expect(state.get().viewport.dpr).toBe(0.5)
      expect(state.get().frameloop).toBe('demand')
      expect(state.gl.shadowMap.type).toBe(THREE.BasicShadowMap)
      await act(async () => renderer.unmount())
    })

    it('mounts with the latest bounds, props, children, and callback after async initialization', async () => {
      let bounds = { width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100, x: 0, y: 0 }
      jest.spyOn(measure, 'default').mockImplementation(() => [() => {}, bounds, () => {}])
      let ready!: () => void
      const gl = jest.fn(async (props) => {
        await new Promise<void>((resolve) => (ready = resolve))
        return new THREE.WebGLRenderer(props)
      })
      const created = jest.fn()
      const mounted = jest.fn()
      function Scene({ name }: { name: string }) {
        const { size, frameloop } = useThree()
        React.useLayoutEffect(() => {
          mounted(name, size.width, frameloop)
        }, [name, size.width, frameloop])
        return <group name={name} />
      }
      const App = ({ name, frameloop }: { name: string; frameloop: 'never' | 'demand' }) => (
        <Canvas gl={gl} frameloop={frameloop} onCreated={(state) => created(name, state.size.width)}>
          <Scene name={name} />
        </Canvas>
      )
      const renderer = await act(async () => render(<App name="initial" frameloop="never" />))
      await act(async () => renderer.rerender(<App name="changed config" frameloop="demand" />))
      bounds = { ...bounds, width: 320 }
      await act(async () => renderer.rerender(<App name="latest" frameloop="demand" />))
      expect(created).not.toHaveBeenCalled()
      expect(mounted).not.toHaveBeenCalled()

      await act(async () => ready())
      expect(gl).toHaveBeenCalledTimes(1)
      expect(created.mock.calls).toEqual([['latest', 320]])
      expect(mounted.mock.calls).toEqual([['latest', 320, 'demand']])
      await act(async () => renderer.unmount())
    })
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
