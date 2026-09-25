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

vi.mock('three/webgpu', async (importOriginal) => ({
  ...(await importOriginal<typeof import('three/webgpu')>()),
  WebGPURenderer: webgpu.MockWebGPURenderer,
}))

import { Canvas, createRoot } from '../src'
import { _roots, unmountComponentAtNode } from '../src/core/renderer'
import { disposeRenderer } from '../src/core/rendererLease'

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
      const root = createRoot(document.createElement('canvas'))
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
      const root = createRoot(canvas)
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
        ;(await primary.configure({ id, renderer: {}, frameloop: 'never' })).render(null)
        ;(await secondary.configure({ primaryCanvas: id, renderer: {}, frameloop: 'never' })).render(null)
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
  })
})
