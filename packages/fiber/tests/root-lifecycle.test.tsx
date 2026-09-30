import { vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { createRoot, type ReconcilerRoot } from '../src/legacy'
import { unmountComponentAtNode } from '../src/core/root'

// Same cases as master #3925 and #3944, with v10's implicit scene camera.
const Activity = (
  React as unknown as { Activity: React.ComponentType<React.PropsWithChildren<{ mode: 'visible' | 'hidden' }>> }
).Activity
const testActivity = Activity ? it : it.skip

describe('master root lifecycle regressions', () => {
  let canvas: HTMLCanvasElement
  let root: ReconcilerRoot<HTMLCanvasElement>
  beforeEach(() => {
    canvas = document.createElement('canvas')
    root = createRoot(canvas)
  })
  afterEach(async () => act(async () => root.unmount()))
  describe('configure', () => {
    it('mounts the scene synchronously', async () => {
      await act(async () => {
        root.configure()
        expect(root.render(<group />).getState().scene.children).toHaveLength(2)
      })
    })

    it('configures itself when rendered without one', async () => {
      await act(async () => {
        expect(root.render(<group />).getState().scene.children).toHaveLength(2)
      })
    })

    it('waits for an async renderer before mounting', async () => {
      let ready!: () => void
      const gl = async (props: any) => {
        await new Promise<void>((resolve) => (ready = resolve))
        return new THREE.WebGLRenderer(props)
      }

      root.configure({ gl })
      const store = root.render(<group />)
      expect(store.getState().internal.active).toBe(false)

      await act(async () => ready())
      expect(store.getState().scene.children).toHaveLength(2)
    })

    it('applies props configured while an async renderer is pending', async () => {
      let ready!: () => void
      const gl = async (props: any) => {
        await new Promise<void>((resolve) => (ready = resolve))
        return new THREE.WebGLRenderer(props)
      }

      root.configure({ gl, frameloop: 'never' })
      root.configure({ frameloop: 'demand' })

      const store = await act(async () => {
        ready()
        return root.render(null)
      })
      expect(store.getState().frameloop).toBe('demand')
    })

    it('disposes an async renderer that lands after unmount', async () => {
      const forceContextLoss = vi.fn()
      let ready!: () => void
      const gl = async (props: any) => {
        await new Promise<void>((resolve) => (ready = resolve))
        const gl = new THREE.WebGLRenderer(props)
        vi.spyOn(gl, 'forceContextLoss').mockImplementation(forceContextLoss)
        return gl
      }

      root.configure({ gl })
      const store = root.render(<group />)
      await act(async () => root.unmount())
      await act(async () => ready())

      expect(store.getState().internal.active).toBe(false)
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
    })

    it('refuses to render when the renderer fails', async () => {
      const error = new Error('no renderer')
      await expect(
        root.configure({
          gl: () => {
            throw error
          },
        }),
      ).rejects.toBe(error)

      expect(() => root.render(<group />)).toThrow(error)
    })

    it('recovers when a failed configure is retried', async () => {
      await expect(
        root.configure({
          gl: () => {
            throw new Error('no renderer')
          },
        }),
      ).rejects.toThrow('no renderer')

      await act(async () => {
        root.configure()
        expect(root.render(<group />).getState().scene.children).toHaveLength(2)
      })
    })
  })

  describe('ownership', () => {
    // Stands in for three's WebGPURenderer, which v9 apps build in an async `gl` factory
    class MockWebGPURenderer {
      initialized = false
      xr = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
      outputColorSpace = ''
      toneMapping = 0
      render = vi.fn()
      setSize = vi.fn()
      setPixelRatio = vi.fn()
      hasInitialized = () => this.initialized
      init = vi.fn(async () => {
        this.initialized = true
      })
      dispose = vi.fn(async () => {})
    }

    async function mount(gl?: NonNullable<Parameters<typeof root.configure>[0]>['gl']) {
      let store!: ReturnType<typeof root.render>
      await act(async () => {
        store = (await root.configure({ gl, frameloop: 'never' })).render(null)
      })
      return { root, state: store.getState() }
    }

    afterEach(() => vi.restoreAllMocks())

    it('disposes a renderer it created, then releases its context', async () => {
      const { root, state } = await mount()
      const dispose = vi.spyOn(state.gl, 'dispose')
      const forceContextLoss = vi.spyOn(state.gl, 'forceContextLoss')

      await act(async () => root.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
      expect(dispose.mock.invocationCallOrder[0]).toBeLessThan(forceContextLoss.mock.invocationCallOrder[0])
    })

    it('disposes a renderer returned by a factory', async () => {
      let gl!: THREE.WebGLRenderer
      const { root } = await mount((props) => (gl = new THREE.WebGLRenderer(props)))
      const dispose = vi.spyOn(gl, 'dispose')

      await act(async () => root.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
    })

    it('preserves v10 ownership for a renderer instance: context and resources stay alive', async () => {
      const gl = new THREE.WebGLRenderer({ canvas: document.createElement('canvas') })
      const dispose = vi.spyOn(gl, 'dispose')
      const forceContextLoss = vi.spyOn(gl, 'forceContextLoss')
      const { root } = await mount(gl)

      await act(async () => root.unmount())
      expect(dispose).not.toHaveBeenCalled()
      expect(forceContextLoss).not.toHaveBeenCalled()
    })

    it('disposes a WebGPU renderer built by an async factory', async () => {
      const gl = new MockWebGPURenderer()
      const { root } = await mount(async () => {
        await gl.init()
        return gl
      })

      await act(async () => root.unmount())
      expect(gl.dispose).toHaveBeenCalledTimes(1)
    })

    it('does not dispose a WebGPU renderer that never initialized', async () => {
      // three's dispose() would start its init, or reject unhandled after a failed one
      const gl = new MockWebGPURenderer()
      const { root } = await mount(() => gl)

      await act(async () => root.unmount())
      expect(gl.dispose).not.toHaveBeenCalled()
    })

    it('still releases the renderer when an earlier teardown step throws', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { root, state } = await mount()
      const dispose = vi.spyOn(state.gl, 'dispose')
      const failure = new Error('disconnect failed')
      state.events.disconnect = () => {
        throw failure
      }

      await act(async () => root.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.any(String), failure)
    })

    it('still releases the context when renderer disposal throws', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { root, state } = await mount()
      const failure = new Error('disposal failed')
      vi.spyOn(state.gl, 'dispose').mockImplementation(() => {
        throw failure
      })
      const lose = vi.spyOn(state.gl, 'forceContextLoss')

      await act(async () => root.unmount())
      expect(lose).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.any(String), failure)
    })

    it('releases custom renderer resources when no dispose method is provided', async () => {
      const gl = {
        render: vi.fn(),
        setSize: vi.fn(),
        setPixelRatio: vi.fn(),
        renderLists: { dispose: vi.fn() },
        forceContextLoss: vi.fn(),
      }
      const { root } = await mount(() => gl)

      await act(async () => root.unmount())
      expect(gl.renderLists.dispose).toHaveBeenCalledTimes(1)
      expect(gl.forceContextLoss).toHaveBeenCalledTimes(1)
    })
  })

  describe('unmounting', () => {
    function deferred<T = void>() {
      let resolve!: (_value: T) => void
      let reject!: (_error: Error) => void
      const promise = new Promise<T>((yes, no) => {
        resolve = yes
        reject = no
      })
      return { promise, resolve, reject }
    }

    afterEach(() => vi.restoreAllMocks())

    it('lets components clean up before disposing their renderer', async () => {
      const gl = new THREE.WebGLRenderer({ canvas })
      const dispose = vi.spyOn(gl, 'dispose')
      const cleanup = vi.fn()
      function Child() {
        React.useEffect(() => cleanup, [])
        return null
      }
      await root.configure({ gl: () => gl, frameloop: 'never' })
      await act(async () => root.render(<Child />))
      await act(async () => root.unmount())

      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(cleanup.mock.invocationCallOrder[0]).toBeLessThan(dispose.mock.invocationCallOrder[0])
    })

    it('prevents an unmounted handle from being reused or affecting a replacement root', async () => {
      const oldRoot = root
      const oldStore = await act(async () => oldRoot.render(null))
      await act(async () => oldRoot.unmount())
      const setSize = vi.spyOn(oldStore.getState().gl, 'setSize')
      const replacement = createRoot(canvas)
      const object = new THREE.Group()
      const store = await act(async () => replacement.render(<primitive object={object} />))
      const dispose = vi.spyOn(store.getState().gl, 'dispose')

      await expect(oldRoot.configure({ size: { width: 321, height: 123, top: 0, left: 0 } })).rejects.toThrow(
        'Cannot configure',
      )
      await act(async () => {
        oldRoot.render(<primitive object={new THREE.Group()} />)
        oldRoot.unmount()
      })

      expect(setSize).not.toHaveBeenCalled()
      expect(oldStore.getState().scene.children).toHaveLength(1)
      expect(store.getState().scene.children.slice(1)).toEqual([object])
      expect(dispose).not.toHaveBeenCalled()
      await act(async () => replacement.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
    })

    it.each(['configure', 'render'] as const)(
      'can resume a pending renderer with %s after requesting unmount',
      async (use) => {
        const pending = deferred<THREE.WebGLRenderer>()
        const gl = new THREE.WebGLRenderer({ canvas })
        const dispose = vi.spyOn(gl, 'dispose')
        const object = new THREE.Group()
        root.configure({ gl: () => pending.promise, frameloop: 'never' })
        const store = root.render(<primitive object={object} />)
        await act(async () => root.unmount())

        if (use === 'configure') root.configure({ frameloop: 'never' })
        else root.render(<primitive object={object} />)
        await act(async () => pending.resolve(gl))

        expect(dispose).not.toHaveBeenCalled()
        expect(store.getState().scene.children.slice(1)).toEqual([object])
        await act(async () => root.unmount())
        expect(dispose).toHaveBeenCalledTimes(1)
      },
    )

    it('finishes accepted configuration before disposing a late renderer', async () => {
      const pending = deferred<THREE.WebGLRenderer>()
      const gl = new THREE.WebGLRenderer({ canvas })
      const release = gl.dispose.bind(gl)
      let sizeAtDisposal: THREE.Vector2 | undefined
      const dispose = vi.spyOn(gl, 'dispose').mockImplementation(() => {
        sizeAtDisposal = gl.getSize(new THREE.Vector2())
        release()
      })
      root.configure({ gl: () => pending.promise, frameloop: 'never' })
      const configured = root.configure({ size: { width: 321, height: 123, top: 0, left: 0 } })
      const callback = vi.fn()
      await act(async () => unmountComponentAtNode(canvas, callback))
      expect(dispose).not.toHaveBeenCalled()
      expect(callback).not.toHaveBeenCalled()

      await act(async () => pending.resolve(gl))

      await expect(configured).resolves.toBe(root)
      expect(sizeAtDisposal).toEqual(new THREE.Vector2(321, 123))
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it.each(['resolve', 'reject'] as const)(
      'completes unmount after asynchronous disposal settles (%s)',
      async (settle) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const store = await act(async () => root.render(null))
        const gl = store.getState().gl
        const pending = deferred()
        const release = gl.dispose.bind(gl)
        const dispose = vi.spyOn(gl, 'dispose').mockImplementation(() => {
          release()
          return pending.promise
        })
        const lose = vi.spyOn(gl, 'forceContextLoss')
        const callback = vi.fn()
        const failure = new Error('disposal failed')

        await act(async () => unmountComponentAtNode(canvas, callback))
        expect(callback).not.toHaveBeenCalled()
        expect(lose).not.toHaveBeenCalled()
        await expect(root.configure()).rejects.toThrow('Cannot configure')
        await act(async () => {
          root.render(<primitive object={new THREE.Group()} />)
          root.unmount()
        })
        expect(store.getState().scene.children).toHaveLength(1)
        expect(dispose).toHaveBeenCalledTimes(1)

        await act(async () => {
          if (settle === 'resolve') pending.resolve()
          else pending.reject(failure)
        })

        expect(lose).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledTimes(1)
        if (settle === 'reject') expect(warn).toHaveBeenCalledWith(expect.any(String), failure)
      },
    )
  })

  testActivity.each([true, false])('restores a primitive with visible=%s after Activity hide/show', async (visible) => {
    const object = new THREE.Group()
    object.visible = visible
    const scene = (mode: 'visible' | 'hidden') => (
      <Activity mode={mode}>
        <primitive object={object} />
      </Activity>
    )

    await act(async () => root.render(scene('visible')))
    expect(object.visible).toBe(visible)
    await act(async () => root.render(scene('hidden')))
    expect(object.visible).toBe(false)
    await act(async () => root.render(scene('visible')))
    expect(object.visible).toBe(visible)
  })

  testActivity.each([
    [false, true],
    [true, false],
    [false, undefined],
  ])('applies a visibility change from %s to %s when Activity is shown', async (initial, next) => {
    const object = new THREE.Group()
    const scene = (mode: 'visible' | 'hidden', visible: boolean | undefined) => (
      <Activity mode={mode}>
        <primitive object={object} {...(visible === undefined ? {} : { visible })} />
      </Activity>
    )

    await act(async () => root.render(scene('visible', initial)))
    await act(async () => root.render(scene('hidden', initial)))
    await act(async () => root.render(scene('hidden', next)))
    expect(object.visible).toBe(false)
    await act(async () => root.render(scene('visible', next)))
    expect(object.visible).toBe(next ?? true)
  })
})
