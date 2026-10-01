import { vi } from 'vitest'
// Ported from master #3925, #3943, #3945, #3946; v10 adds the default camera to the scene.
import React, { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import { Canvas, RootState, RootStore, useStore, useThree, useFrame } from '../src/legacy'
import * as measure from 'react-use-measure'

// CI also covers React 19.0, which has neither Activity nor its types.
const Activity = (
  React as unknown as {
    Activity: React.ComponentType<React.PropsWithChildren<{ mode: 'visible' | 'hidden' }>>
  }
).Activity
const describeActivity = Activity ? describe : describe.skip
const testActivity = Activity ? it : it.skip

describe('master Canvas lifecycle regressions', () => {
  it('updates children without restoring unchanged configuration props', async () => {
    let state!: RootState
    const App = ({ name, changed = false }: { name: string; changed?: boolean }) => (
      <Canvas
        gl={{ shadows: { type: changed ? THREE.VSMShadowMap : THREE.PCFShadowMap } }}
        frameloop={changed ? 'always' : 'never'}
        performance={{ min: changed ? 0.3 : 0.5 }}
        onCreated={(created) => (state = created)}>
        <group name={name} />
      </Canvas>
    )
    const renderer = await act(async () => render(<App name="initial" />))
    await act(async () => {
      state.setFrameloop('demand')
      state.set((current) => ({ performance: { ...current.performance, min: 0.2 } }))
      state.gl.shadowMap.type = THREE.BasicShadowMap
    })
    state.gl.shadowMap.needsUpdate = false

    await act(async () => renderer.rerender(<App name="updated" />))
    expect(state.scene.children[1].name).toBe('updated')
    expect(state.get().frameloop).toBe('demand')
    expect(state.get().performance.min).toBe(0.2)
    expect(state.gl.shadowMap.type).toBe(THREE.BasicShadowMap)
    expect(state.gl.shadowMap.needsUpdate).toBe(false)

    await act(async () => renderer.rerender(<App name="changed props" changed />))
    expect(state.get().frameloop).toBe('always')
    expect(state.get().performance.min).toBe(0.3)
    expect(state.gl.shadowMap.type).toBe(THREE.VSMShadowMap)
    await act(async () => renderer.unmount())
  })

  describe('rerendering', () => {
    afterEach(() => vi.restoreAllMocks())

    it('calls the latest onPointerMissed without publishing store updates', async () => {
      const missed = vi.fn()
      let store!: RootStore
      function Scene({ name }: { name: string }) {
        store = useStore()
        return <group name={name} />
      }
      const App = ({ name }: { name: string }) => (
        <Canvas gl={{ shadows: true }} frameloop="never" onPointerMissed={() => missed(name)}>
          <Scene name={name} />
        </Canvas>
      )
      const renderer = await act(async () => render(<App name="initial" />))
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)

      await act(async () => renderer.rerender(<App name="updated" />))
      expect(store.getState().scene.children[1].name).toBe('updated')
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
      expect(state.scene.children[1].name).toBe('updated')
      await act(async () => renderer.unmount())
    })

    it('updates measured bounds without resetting runtime values', async () => {
      let bounds = { width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100, x: 0, y: 0 }
      vi.spyOn(measure, 'default').mockImplementation(() => [() => {}, bounds, () => {}])
      let state!: RootState
      const App = () => <Canvas gl={{ shadows: true }} frameloop="never" onCreated={(created) => (state = created)} />
      const renderer = await act(async () => render(<App />))
      await act(async () => {
        state.setFrameloop('demand')
        state.gl.shadowMap.type = THREE.BasicShadowMap
      })
      const resize = vi.spyOn(state.gl, 'setSize')

      bounds = { ...bounds, top: 20, left: 10 }
      await act(async () => renderer.rerender(<App />))
      expect(state.get().size).toEqual({ width: 100, height: 100, top: 20, left: 10 })
      expect(resize).not.toHaveBeenCalled()
      bounds = { ...bounds, width: 200 }
      await act(async () => renderer.rerender(<App />))
      expect(state.gl.getSize(new THREE.Vector2())).toEqual(new THREE.Vector2(200, 100))
      expect(state.get().frameloop).toBe('demand')
      expect(state.gl.shadowMap.type).toBe(THREE.BasicShadowMap)
      await act(async () => renderer.unmount())
    })

    it('follows the device pixel ratio after browser zoom', async () => {
      let bounds = { width: 150, height: 150, top: 0, left: 0, bottom: 150, right: 150, x: 0, y: 0 }
      vi.spyOn(measure, 'default').mockImplementation(() => [() => {}, bounds, () => {}])
      const initialRatio = window.devicePixelRatio
      let state!: RootState
      const App = () => <Canvas frameloop="never" onCreated={(created) => (state = created)} />
      try {
        window.devicePixelRatio = 1
        const renderer = await act(async () => render(<App />))
        expect(state.gl.getPixelRatio()).toBe(1)

        // Zooming to 150% raises the device ratio and shrinks the container in CSS pixels
        window.devicePixelRatio = 1.5
        bounds = { ...bounds, width: 100, height: 100, bottom: 100, right: 100 }
        await act(async () => renderer.rerender(<App />))
        expect(state.gl.getPixelRatio()).toBe(1.5)
        await act(async () => renderer.unmount())
      } finally {
        window.devicePixelRatio = initialRatio
      }
    })

    it('mounts with the latest bounds, props, children, and callback after async initialization', async () => {
      let bounds = { width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100, x: 0, y: 0 }
      vi.spyOn(measure, 'default').mockImplementation(() => [() => {}, bounds, () => {}])
      let ready!: () => void
      const gl = vi.fn(async (props) => {
        await new Promise<void>((resolve) => (ready = resolve))
        return new THREE.WebGLRenderer(props)
      })
      const created = vi.fn()
      const mounted = vi.fn()
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
      const object = state.scene.children[1]
      const dispose = vi.spyOn(gl, 'dispose')
      const forceContextLoss = vi.spyOn(gl, 'forceContextLoss')

      await act(async () => renderer.rerender(<App mode="hidden" />))
      expect(dispose).not.toHaveBeenCalled()
      expect(forceContextLoss).not.toHaveBeenCalled()

      await act(async () => renderer.rerender(<App mode="visible" />))
      expect(state.gl).toBe(gl)
      expect(state.scene.children).toHaveLength(2)
      expect(state.scene.children[1]).toBe(object)
      expect(dispose).not.toHaveBeenCalled()
      expect(forceContextLoss).not.toHaveBeenCalled()

      await act(async () => renderer.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
    })

    it('disconnects scene effects and frame subscriptions while hidden without losing state', async () => {
      let state!: RootState
      const effects = new Set<string>()
      const frame = vi.fn()
      function Scene() {
        const [object] = React.useState(() => new THREE.Group())
        React.useLayoutEffect(() => {
          effects.add('layout')
          return () => void effects.delete('layout')
        }, [])
        React.useEffect(() => {
          effects.add('passive')
          return () => void effects.delete('passive')
        }, [])
        useFrame(frame)
        return <primitive object={object} />
      }
      // Hiding must propagate even when Canvas and its children do not rerender.
      const canvas = (
        <Canvas frameloop="never" onCreated={(created) => (state = created)}>
          <Scene />
        </Canvas>
      )
      const App = ({ mode }: { mode: 'visible' | 'hidden' }) => (
        <Wrapper>
          <Activity mode={mode}>{canvas}</Activity>
        </Wrapper>
      )
      const renderer = await act(async () => render(<App mode="visible" />))
      const object = state.scene.children[1]
      const dispose = vi.spyOn(state.gl, 'dispose')
      expect(effects).toEqual(new Set(['layout', 'passive']))
      state.advance(1)
      expect(frame).toHaveBeenCalledTimes(1)

      await act(async () => renderer.rerender(<App mode="hidden" />))
      expect(effects.size).toBe(0)
      expect(object.visible).toBe(false)
      state.advance(2)
      expect(frame).toHaveBeenCalledTimes(1)
      expect(dispose).not.toHaveBeenCalled()

      await act(async () => renderer.rerender(<App mode="visible" />))
      expect(effects).toEqual(new Set(['layout', 'passive']))
      expect(state.scene.children[1]).toBe(object)
      expect(object.visible).toBe(true)
      state.advance(3)
      expect(frame).toHaveBeenCalledTimes(2)
      expect(dispose).not.toHaveBeenCalled()
      await act(async () => renderer.unmount())
      expect(effects.size).toBe(0)
      expect(dispose).toHaveBeenCalledTimes(1)
    })

    it('stays hidden while either ancestor Activity is hidden', async () => {
      let state!: RootState
      const canvas = (
        <Canvas frameloop="never" onCreated={(created) => (state = created)}>
          <group />
        </Canvas>
      )
      const App = ({ outer, inner }: { outer: 'visible' | 'hidden'; inner: 'visible' | 'hidden' }) => (
        <Wrapper>
          <Activity mode={outer}>
            <Activity mode={inner}>{canvas}</Activity>
          </Activity>
        </Wrapper>
      )
      const renderer = await act(async () => render(<App outer="visible" inner="visible" />))
      const object = state.scene.children[1]
      for (const [outer, inner] of [
        ['visible', 'hidden'],
        ['hidden', 'hidden'],
        ['hidden', 'visible'],
      ] as const) {
        await act(async () => renderer.rerender(<App outer={outer} inner={inner} />))
        expect(object.visible).toBe(false)
      }
      await act(async () => renderer.rerender(<App outer="visible" inner="visible" />))
      expect(object.visible).toBe(true)
      expect(state.scene.children[1]).toBe(object)
      await act(async () => renderer.unmount())
    })

    it('waits for an initially hidden Activity and forwards updated context on reveal', async () => {
      const Value = React.createContext('initial')
      const created = vi.fn()
      const observed = vi.fn()
      function Scene() {
        const value = React.useContext(Value)
        React.useLayoutEffect(() => observed(value), [value])
        return <group name={value} />
      }
      const canvas = (
        <Canvas frameloop="never" onCreated={created}>
          <Scene />
        </Canvas>
      )
      const App = ({ mode, value }: { mode: 'visible' | 'hidden'; value: string }) => (
        <Wrapper>
          <Value.Provider value={value}>
            <Activity mode={mode}>{canvas}</Activity>
          </Value.Provider>
        </Wrapper>
      )
      const renderer = await act(async () => render(<App mode="hidden" value="initial" />))
      expect(created).not.toHaveBeenCalled()
      expect(observed).not.toHaveBeenCalled()
      await act(async () => renderer.rerender(<App mode="visible" value="first" />))
      const state: RootState = created.mock.calls[0][0]
      const object = state.scene.children[1]
      expect(observed).toHaveBeenLastCalledWith('first')
      await act(async () => renderer.rerender(<App mode="hidden" value="updated" />))
      observed.mockClear()
      await act(async () => renderer.rerender(<App mode="visible" value="updated" />))
      expect(observed).toHaveBeenLastCalledWith('updated')
      expect(state.scene.children[1]).toBe(object)
      expect(object.name).toBe('updated')
      expect(created).toHaveBeenCalledTimes(1)
      await act(async () => renderer.unmount())
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
      const dispose = vi.spyOn(gl, 'dispose')
      const forceContextLoss = vi.spyOn(gl, 'forceContextLoss')

      await act(async () => renderer.rerender(<App mode="hidden" />))
      expect(dispose).not.toHaveBeenCalled()
      expect(forceContextLoss).not.toHaveBeenCalled()

      await act(async () => renderer.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
    })
  })

  it('tears down a canvas that unmounts as it mounts', async () => {
    const forceContextLoss = vi.fn()
    let connected: unknown

    // A layout effect in the parent unmounts the canvas within the same commit
    function Parent() {
      const [mounted, setMounted] = React.useState(true)
      React.useLayoutEffect(() => setMounted(false), [])
      return mounted ? (
        <Canvas
          gl={(props) => {
            const gl = new THREE.WebGLRenderer(props)
            vi.spyOn(gl, 'forceContextLoss').mockImplementation(forceContextLoss)
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
    const dispose = vi.spyOn(gl, 'dispose')

    await act(async () => resolve())
    expect(renderer.queryByTestId('loading')).toBeNull()
    expect(state.gl).toBe(gl)
    expect(state.scene.children).toHaveLength(2)
    expect(dispose).not.toHaveBeenCalled()

    await act(async () => renderer.unmount())
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('keeps scene effects connected when only the source Suspense boundary is hidden', async () => {
    const pending = new Promise<void>(() => {})
    let state!: RootState
    const cleanup = vi.fn()
    function Scene() {
      React.useEffect(() => cleanup, [])
      return <group />
    }
    function Suspend({ suspended }: { suspended: boolean }) {
      if (suspended) React.use(pending)
      return null
    }
    const App = ({ suspended }: { suspended: boolean }) => (
      <React.Suspense fallback={<div data-testid="loading" />}>
        <Suspend suspended={suspended} />
        <Canvas frameloop="never" onCreated={(created) => (state = created)}>
          <Scene />
        </Canvas>
      </React.Suspense>
    )
    const renderer = await act(async () => render(<App suspended={false} />))
    const object = state.scene.children[1]
    await act(async () => renderer.rerender(<App suspended />))
    expect(renderer.queryByTestId('loading')).not.toBeNull()
    expect(cleanup).not.toHaveBeenCalled()
    expect(object.visible).toBe(true)
    await act(async () => renderer.rerender(<App suspended={false} />))
    expect(state.scene.children[1]).toBe(object)
    expect(cleanup).not.toHaveBeenCalled()
    await act(async () => renderer.unmount())
    expect(cleanup).toHaveBeenCalledTimes(1)
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
    const forceContextLoss = vi.spyOn(gl, 'forceContextLoss')

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
      expect(state.scene.children).toHaveLength(2)
      expect(state.get().events.connected).toBeInstanceOf(HTMLDivElement)
    })

    testActivity('retains a renderer that resolves while hidden and mounts the scene when shown', async () => {
      let ready!: () => void
      let gl!: THREE.WebGLRenderer
      const onCreated = vi.fn()
      const createRenderer = vi.fn(async (props) => {
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

      const dispose = vi.spyOn(gl, 'dispose')
      await act(async () => renderer.rerender(<App mode="visible" />))
      expect(onCreated).toHaveBeenCalledTimes(1)
      expect(createRenderer).toHaveBeenCalledTimes(1)
      expect(onCreated.mock.calls[0][0].gl).toBe(gl)
      expect(onCreated.mock.calls[0][0].scene.children).toHaveLength(2)
      expect(dispose).not.toHaveBeenCalled()

      await act(async () => renderer.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
    })

    it('never mounts when the canvas unmounts while the renderer is pending', async () => {
      const forceContextLoss = vi.fn()
      const onCreated = vi.fn()
      let ready!: () => void

      const renderer = await act(async () =>
        render(
          <Canvas
            gl={async (props) => {
              await new Promise<void>((resolve) => (ready = resolve))
              const gl = new THREE.WebGLRenderer(props)
              vi.spyOn(gl, 'forceContextLoss').mockImplementation(forceContextLoss)
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

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
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
})
