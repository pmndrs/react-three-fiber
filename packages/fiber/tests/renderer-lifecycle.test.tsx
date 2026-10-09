import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import { CanvasTarget } from 'three/webgpu'

const webgpu = vi.hoisted(() => {
  const instances: MockWebGPURenderer[] = []
  let initImpl: () => Promise<void> = async () => {}

  class MockWebGPURenderer {
    initialized = false
    backend = { isWebGPUBackend: true }
    shadowMap = { enabled: false, type: 0 }
    outputColorSpace = ''
    toneMapping = 0
    xr = {
      enabled: false,
      isPresenting: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setAnimationLoop: vi.fn(),
    }
    init = vi.fn(async () => {
      await initImpl()
      this.initialized = true
    })
    hasInitialized = vi.fn(() => this.initialized)
    dispose = vi.fn()
    render = vi.fn()
    setSize = vi.fn()
    setPixelRatio = vi.fn()

    constructor(_props: unknown) {
      instances.push(this)
    }
  }

  return {
    MockWebGPURenderer,
    instances,
    setInitImpl(implementation: () => Promise<void>) {
      initImpl = implementation
    },
    reset() {
      instances.length = 0
      initImpl = async () => {}
    },
  }
})

// The root entry builds the WebGPU renderer from its support module's `Renderer`
vi.mock('../src/support/webgpu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/support/webgpu')>()
  return { webgpuSupport: { ...actual.webgpuSupport, Renderer: webgpu.MockWebGPURenderer } }
})

import { advance, Canvas, createRoot } from '../src'
import { _roots, unmountComponentAtNode } from '../src/core/root'
import { disposeRenderer } from '../src/core/renderer'
// WebGLRenderer lives on /legacy: the gl-prop tests below run there
import { createRoot as createLegacyRoot } from '../src/legacy'

const deferred = () => {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => ((resolve = res), (reject = rej)))
  return { promise, resolve, reject }
}

describe('renderer lifecycle', () => {
  beforeEach(() => {
    webgpu.reset()
  })

  afterEach(async () => {
    await act(async () => {
      for (const canvas of [..._roots.keys()]) unmountComponentAtNode(canvas)
    })
    vi.restoreAllMocks()
  })

  describe('ownership', () => {
    it('disposes a renderer it created once the root unmounts', async () => {
      const root = createRoot(document.createElement('canvas'))
      await act(async () => (await root.configure({ renderer: {}, frameloop: 'never' })).render(null))
      const [renderer] = webgpu.instances

      expect(renderer.dispose).not.toHaveBeenCalled()
      await act(async () => root.unmount())
      expect(renderer.dispose).toHaveBeenCalledTimes(1)
    })

    it('disposes a renderer returned by a factory', async () => {
      const root = createRoot(document.createElement('canvas'))
      await act(async () =>
        (
          await root.configure({ renderer: (props: any) => new webgpu.MockWebGPURenderer(props), frameloop: 'never' })
        ).render(null),
      )

      await act(async () => root.unmount())
      expect(webgpu.instances[0].dispose).toHaveBeenCalledTimes(1)
    })

    it('leaves a renderer instance to its caller, who may reuse it', async () => {
      const canvas = document.createElement('canvas')
      const renderer = new webgpu.MockWebGPURenderer({ canvas })

      for (let mount = 0; mount < 2; mount++) {
        const root = createRoot(canvas)
        await act(async () => (await root.configure({ renderer: renderer as any, frameloop: 'never' })).render(null))
        await act(async () => root.unmount())
        // The teardown ran, and it left the renderer alone
        expect(_roots.has(canvas)).toBe(false)
      }

      expect(renderer.init).toHaveBeenCalledTimes(1)
      expect(renderer.dispose).not.toHaveBeenCalled()
    })

    it('disposes each renderer it created across repeated mounts', async () => {
      const canvas = document.createElement('canvas')
      for (let mount = 0; mount < 2; mount++) {
        const root = createRoot(canvas)
        await act(async () => (await root.configure({ renderer: {}, frameloop: 'never' })).render(null))
        await act(async () => root.unmount())
      }

      expect(webgpu.instances).toHaveLength(2)
      for (const renderer of webgpu.instances) expect(renderer.dispose).toHaveBeenCalledTimes(1)
    })

    it('reports a rejected async dispose instead of leaving it unhandled', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const root = createRoot(document.createElement('canvas'))
      await act(async () => (await root.configure({ renderer: {}, frameloop: 'never' })).render(null))
      const failure = new Error('backend dispose failed')
      webgpu.instances[0].dispose.mockImplementation(() => Promise.reject(failure))

      await act(async () => root.unmount())
      expect(warn).toHaveBeenCalledWith('[R3F] Error disposing renderer', failure)
    })

    it('never disposes a renderer whose init has not succeeded', () => {
      // three's dispose() would start that init, or reject unhandled after a failed one
      const renderer = new webgpu.MockWebGPURenderer({})
      disposeRenderer(renderer as any)
      expect(renderer.dispose).not.toHaveBeenCalled()
    })

    it('disposes a WebGLRenderer it created and releases its context', async () => {
      const root = createLegacyRoot(document.createElement('canvas'))
      let gl!: THREE.WebGLRenderer
      await act(async () => {
        const store = (await root.configure({ gl: {}, frameloop: 'never' })).render(null)
        gl = store.getState().gl as THREE.WebGLRenderer
      })
      const dispose = vi.spyOn(gl, 'dispose')
      const forceContextLoss = vi.spyOn(gl, 'forceContextLoss')

      await act(async () => root.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
      expect(dispose.mock.invocationCallOrder[0]).toBeLessThan(forceContextLoss.mock.invocationCallOrder[0])
    })

    it('leaves a WebGLRenderer instance and its context to its caller', async () => {
      const canvas = document.createElement('canvas')
      const gl = new THREE.WebGLRenderer({ canvas })
      const dispose = vi.spyOn(gl, 'dispose')
      const forceContextLoss = vi.spyOn(gl, 'forceContextLoss')
      const root = createLegacyRoot(canvas)
      await act(async () => (await root.configure({ gl, frameloop: 'never' })).render(null))

      await act(async () => root.unmount())
      expect(_roots.has(canvas)).toBe(false)
      expect(dispose).not.toHaveBeenCalled()
      expect(forceContextLoss).not.toHaveBeenCalled()
    })
  })

  describe('React lifecycle', () => {
    it('keeps the renderer through a StrictMode remount and disposes it on the real unmount', async () => {
      const mounted = render(
        <React.StrictMode>
          <Canvas renderer={{}} frameloop="never" />
        </React.StrictMode>,
      )
      await act(async () => {})

      expect(webgpu.instances).toHaveLength(1)
      expect(webgpu.instances[0].dispose).not.toHaveBeenCalled()

      await act(async () => mounted.unmount())
      expect(webgpu.instances[0].dispose).toHaveBeenCalledTimes(1)
    })

    it('releases a renderer whose init settles after its root unmounted', async () => {
      const init = deferred()
      webgpu.setInitImpl(() => init.promise)
      const canvas = document.createElement('canvas')
      const root = createRoot(canvas)
      const configuring = root.configure({ renderer: {}, frameloop: 'never' })

      // React commits the unmount while init is in flight; teardown waits for the renderer
      await act(async () => root.unmount())
      expect(webgpu.instances[0].dispose).not.toHaveBeenCalled()

      await act(async () => init.resolve())
      await configuring
      expect(webgpu.instances[0].dispose).toHaveBeenCalledTimes(1)
      expect(_roots.has(canvas)).toBe(false)
    })

    it('still releases the renderer when an earlier teardown step throws', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const root = createRoot(document.createElement('canvas'))
      let store!: ReturnType<typeof root.render>
      await act(async () => {
        store = (await root.configure({ renderer: {}, frameloop: 'never' })).render(null)
      })
      store.getState().events.disconnect = () => {
        throw new Error('disconnect failed')
      }

      await act(async () => root.unmount())
      expect(webgpu.instances[0].dispose).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('teardown may be incomplete'), expect.any(Error))
    })
  })

  describe('multi-canvas', () => {
    async function mountPair(id: string) {
      const primary = createRoot(document.createElement('canvas'))
      const secondaryCanvas = document.createElement('canvas')
      const secondary = createRoot(secondaryCanvas)
      await act(async () => {
        ;(await primary.configure({ id, primary: true, renderer: {}, frameloop: 'never' })).render(null)
        ;(await secondary.configure({ share: id, renderer: {}, frameloop: 'never' })).render(null)
      })
      return { primary, secondary, secondaryCanvas, shared: webgpu.instances[0] }
    }

    it('keeps a shared renderer alive until the last canvas using it unmounts', async () => {
      const { primary, secondary, secondaryCanvas, shared } = await mountPair('lifecycle-primary-first')

      await act(async () => primary.unmount())
      const internal = _roots.get(secondaryCanvas)!.store.getState().internal
      expect(shared.dispose).not.toHaveBeenCalled()
      expect(internal.actualRenderer).toBe(shared)
      expect(internal.unregisterRoot).toBeTypeOf('function')

      await act(async () => secondary.unmount())
      expect(shared.dispose).toHaveBeenCalledTimes(1)
    })

    it('disposes only its own canvas target when a secondary unmounts', async () => {
      const targetDispose = vi.spyOn(CanvasTarget.prototype, 'dispose')
      const { primary, secondary, shared } = await mountPair('lifecycle-secondary-first')

      await act(async () => secondary.unmount())
      expect(targetDispose).toHaveBeenCalledTimes(1)
      expect(shared.dispose).not.toHaveBeenCalled()

      await act(async () => primary.unmount())
      expect(shared.dispose).toHaveBeenCalledTimes(1)
    })

    it('waits for an async dispose only in the unmount that releases the last lease', async () => {
      const { secondaryCanvas, shared } = await mountPair('lifecycle-async-release')
      const primaryCanvas = [..._roots.keys()].find((canvas) => canvas !== secondaryCanvas)!
      const disposal = deferred()
      shared.dispose.mockImplementation(() => disposal.promise)

      // The secondary still borrows the renderer: nothing is disposed, so nothing to wait for
      const primaryDone = vi.fn()
      await act(async () => unmountComponentAtNode(primaryCanvas, primaryDone))
      expect(shared.dispose).not.toHaveBeenCalled()
      expect(primaryDone).toHaveBeenCalledTimes(1)

      const secondaryDone = vi.fn()
      await act(async () => unmountComponentAtNode(secondaryCanvas, secondaryDone))
      expect(shared.dispose).toHaveBeenCalledTimes(1)
      expect(_roots.has(secondaryCanvas)).toBe(false)
      expect(secondaryDone).not.toHaveBeenCalled()

      await act(async () => disposal.resolve())
      expect(secondaryDone).toHaveBeenCalledTimes(1)
    })
  })

  describe('release', () => {
    async function mountWebGPU(canvas = document.createElement('canvas')) {
      const root = createRoot(canvas)
      await act(async () => (await root.configure({ renderer: {}, frameloop: 'never' })).render(null))
      return { canvas, root, renderer: webgpu.instances[webgpu.instances.length - 1] }
    }

    // A rejection nobody handled fails the run, but not the test that caused it
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    const flushRejections = () => new Promise((resolve) => setTimeout(resolve, 0))
    beforeEach(() => {
      unhandled.length = 0
      process.on('unhandledRejection', onUnhandled)
    })
    afterEach(() => {
      process.off('unhandledRejection', onUnhandled)
    })

    /** What drives a renderer. None of it may run once its disposal has started */
    const drives = (renderer: InstanceType<typeof webgpu.MockWebGPURenderer>) =>
      [renderer.render, renderer.setSize, renderer.setPixelRatio, renderer.init, renderer.dispose].map(
        (method) => method.mock.calls.length,
      )

    it('releases the WebGL context even when dispose() throws', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const root = createLegacyRoot(document.createElement('canvas'))
      let gl!: THREE.WebGLRenderer
      await act(async () => {
        gl = (await root.configure({ gl: {}, frameloop: 'never' })).render(null).getState().gl as THREE.WebGLRenderer
      })
      const failure = new Error('dispose failed')
      vi.spyOn(gl, 'dispose').mockImplementation(() => {
        throw failure
      })
      const forceContextLoss = vi.spyOn(gl, 'forceContextLoss')

      await act(async () => root.unmount())
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith('[R3F] Error disposing renderer', failure)
    })

    it('calls the unmount callback once an async dispose() settles', async () => {
      const { canvas, renderer } = await mountWebGPU()
      let settle!: () => void
      renderer.dispose.mockImplementation(() => new Promise<void>((resolve) => (settle = resolve)))
      const callback = vi.fn()

      await act(async () => unmountComponentAtNode(canvas, callback))
      expect(renderer.dispose).toHaveBeenCalledTimes(1)
      expect(callback).not.toHaveBeenCalled()

      await act(async () => settle())
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('calls the unmount callback synchronously for a renderer it does not dispose', async () => {
      const canvas = document.createElement('canvas')
      const renderer = new webgpu.MockWebGPURenderer({ canvas })
      // Never settles: a caller's renderer is not disposed, so nothing waits on it
      renderer.dispose.mockImplementation(() => new Promise<void>(() => {}))
      const root = createRoot(canvas)
      await act(async () => (await root.configure({ renderer: renderer as any, frameloop: 'never' })).render(null))
      const callback = vi.fn()

      await act(async () => unmountComponentAtNode(canvas, callback))
      expect(renderer.dispose).not.toHaveBeenCalled()
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('reports an unmount callback that throws after an async dispose()', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { canvas, renderer } = await mountWebGPU()
      renderer.dispose.mockImplementation(async () => {})
      const failure = new Error('callback failed')

      await act(async () =>
        unmountComponentAtNode(canvas, () => {
          throw failure
        }),
      )
      expect(warn).toHaveBeenCalledWith('[R3F] Error in unmount callback', failure)
    })

    it('reports a forceContextLoss() that throws and still finishes the teardown', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const canvas = document.createElement('canvas')
      const root = createLegacyRoot(canvas)
      let gl!: THREE.WebGLRenderer
      await act(async () => {
        gl = (await root.configure({ gl: {}, frameloop: 'never' })).render(null).getState().gl as THREE.WebGLRenderer
      })
      const failure = new Error('context loss failed')
      const dispose = vi.spyOn(gl, 'dispose')
      vi.spyOn(gl, 'forceContextLoss').mockImplementation(() => {
        throw failure
      })
      const callback = vi.fn()

      await act(async () => unmountComponentAtNode(canvas, callback))
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith('[R3F] Error disposing renderer', failure)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('finishes the rest of the teardown when React commits, before an async dispose() settles', async () => {
      const { canvas, root, renderer } = await mountWebGPU()
      const store = _roots.get(canvas)!.store
      const disposal = deferred()
      renderer.dispose.mockImplementation(() => disposal.promise)

      await act(async () => root.unmount())
      expect(_roots.has(canvas)).toBe(false)
      expect(store.getState().internal.active).toBe(false)
      expect(store.getState().internal.releaseRenderer).toBeUndefined()
      expect(renderer.dispose).toHaveBeenCalledTimes(1)

      // Unmounting again while dispose is pending changes nothing
      await act(async () => root.unmount())
      await act(async () => disposal.resolve())
      expect(renderer.dispose).toHaveBeenCalledTimes(1)
    })

    it('does not drive a renderer once its disposal has started', async () => {
      const { canvas, renderer } = await mountWebGPU()
      const disposal = deferred()
      let atDispose: number[] = []
      renderer.dispose.mockImplementation(() => {
        atDispose = drives(renderer)
        return disposal.promise
      })

      await act(async () => unmountComponentAtNode(canvas))
      await act(async () => {
        advance(performance.now())
        advance(performance.now() + 16)
      })
      await act(async () => disposal.resolve())
      expect(drives(renderer)).toEqual(atDispose)
    })

    it('reports a rejected async dispose() once, then calls the unmount callback', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { canvas, renderer } = await mountWebGPU()
      const disposal = deferred()
      renderer.dispose.mockImplementation(() => disposal.promise)
      const failure = new Error('backend dispose failed')
      const callback = vi.fn()

      await act(async () => unmountComponentAtNode(canvas, callback))
      await act(async () => disposal.reject(failure))
      await flushRejections()
      expect(warn.mock.calls.filter((args) => args.includes(failure))).toHaveLength(1)
      expect(unhandled).toEqual([])
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('leaves no unhandled rejection when the unmount callback throws after an async dispose()', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { canvas, renderer } = await mountWebGPU()
      renderer.dispose.mockImplementation(async () => {})

      await act(async () =>
        unmountComponentAtNode(canvas, () => {
          throw new Error('callback failed')
        }),
      )
      await flushRejections()
      expect(unhandled).toEqual([])
    })

    it('remounts the same canvas while the previous renderer is still disposing', async () => {
      const warn = vi.spyOn(console, 'warn')
      const canvas = document.createElement('canvas')
      const first = await mountWebGPU(canvas)
      const disposal = deferred()
      first.renderer.dispose.mockImplementation(() => disposal.promise)
      const callback = vi.fn()
      await act(async () => unmountComponentAtNode(canvas, callback))

      const second = await mountWebGPU(canvas)
      const secondRoot = _roots.get(canvas)!
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('createRoot should only be called once'))
      expect(second.renderer).not.toBe(first.renderer)
      const beforeSettle = drives(second.renderer)

      // The old release finishes without reaching into the new root or its renderer
      await act(async () => disposal.resolve())
      expect(callback).toHaveBeenCalledTimes(1)
      expect(_roots.get(canvas)).toBe(secondRoot)
      expect(secondRoot.store.getState().renderer).toBe(second.renderer)
      expect(secondRoot.store.getState().internal.active).toBe(true)
      expect(drives(second.renderer)).toEqual(beforeSettle)

      // The new root still owns, and releases, its own renderer
      await act(async () => second.root.unmount())
      expect(second.renderer.dispose).toHaveBeenCalledTimes(1)
      expect(first.renderer.dispose).toHaveBeenCalledTimes(1)
    })

    it('never disposes a renderer whose init fails after its root unmounted, and finishes the teardown', async () => {
      const init = deferred()
      webgpu.setInitImpl(() => init.promise)
      const canvas = document.createElement('canvas')
      const root = createRoot(canvas)
      const configuring = root.configure({ renderer: {}, frameloop: 'never' }).then(
        () => 'resolved',
        () => 'rejected',
      )
      const callback = vi.fn()

      // Teardown waits for the renderer still being created
      await act(async () => unmountComponentAtNode(canvas, callback))
      expect(_roots.has(canvas)).toBe(true)
      expect(callback).not.toHaveBeenCalled()

      await act(async () => init.reject(new Error('no adapter')))
      expect(await configuring).toBe('rejected')
      await flushRejections()
      expect(webgpu.instances[0].dispose).not.toHaveBeenCalled()
      expect(_roots.has(canvas)).toBe(false)
      expect(callback).toHaveBeenCalledTimes(1)
      expect(unhandled).toEqual([])
    })

    it('calls the unmount callback after a late init and the async dispose() that follows it', async () => {
      const init = deferred()
      webgpu.setInitImpl(() => init.promise)
      const canvas = document.createElement('canvas')
      const root = createRoot(canvas)
      const configuring = root.configure({ renderer: {}, frameloop: 'never' })
      const callback = vi.fn()

      await act(async () => unmountComponentAtNode(canvas, callback))
      const [renderer] = webgpu.instances
      const disposal = deferred()
      renderer.dispose.mockImplementation(() => disposal.promise)

      await act(async () => init.resolve())
      await configuring
      expect(renderer.dispose).toHaveBeenCalledTimes(1)
      expect(callback).not.toHaveBeenCalled()

      await act(async () => disposal.resolve())
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
