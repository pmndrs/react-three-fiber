import { act } from 'react'

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

import { advance, createRoot, useFrame } from '../src'
import { _roots, unmountComponentAtNode } from '../src/core/renderer'

describe('root teardown', () => {
  beforeEach(() => {
    webgpu.reset()
  })

  afterEach(async () => {
    await act(async () => {
      for (const canvas of [..._roots.keys()]) unmountComponentAtNode(canvas)
    })
    vi.restoreAllMocks()
  })

  it('tears the root down once React commits the unmount, without a timer', async () => {
    const canvas = document.createElement('canvas')
    const root = createRoot(canvas)
    let store!: ReturnType<typeof root.render>
    await act(async () => {
      store = (await root.configure({ renderer: {}, frameloop: 'never' })).render(null)
    })

    await act(async () => root.unmount())
    expect(_roots.has(canvas)).toBe(false)
    expect(store.getState().internal.active).toBe(false)
    expect(store.getState().internal.unregisterRoot).toBeUndefined()
  })

  it('keeps the root when it is configured again before the unmount commits', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const canvas = document.createElement('canvas')
    const first = createRoot(canvas)
    await act(async () => (await first.configure({ renderer: {}, frameloop: 'never' })).render(null))

    await act(async () => {
      first.unmount()
      // Same canvas, so the same root: configuring it cancels the pending teardown
      const second = createRoot(canvas)
      ;(await second.configure({ renderer: {}, frameloop: 'never' })).render(null)
    })

    const internal = _roots.get(canvas)!.store.getState().internal
    expect(webgpu.instances).toHaveLength(1)
    expect(internal.active).toBe(true)
    expect(internal.unregisterRoot).toBeTypeOf('function')
  })

  it('waits for a renderer still initializing, then leaves no frame jobs behind', async () => {
    let finishInit!: () => void
    webgpu.setInitImpl(() => new Promise<void>((resolve) => (finishInit = resolve)))
    const canvas = document.createElement('canvas')
    const root = createRoot(canvas)
    const configuring = root.configure({ renderer: {}, frameloop: 'never' })
    const store = _roots.get(canvas)!.store

    await act(async () => root.unmount())
    expect(_roots.has(canvas)).toBe(true)

    await act(async () => finishInit())
    await configuring
    expect(_roots.has(canvas)).toBe(false)
    expect(store.getState().internal.unregisterRoot).toBeUndefined()
  })

  it('keeps running frame jobs for a root rendered again before its teardown', async () => {
    const canvas = document.createElement('canvas')
    const root = createRoot(canvas)
    const frames: number[] = []
    function Ticker() {
      useFrame(() => void frames.push(1))
      return null
    }
    let store!: ReturnType<typeof root.render>
    await act(async () => {
      store = (await root.configure({ renderer: {}, frameloop: 'never' })).render(null)
    })

    await act(async () => {
      root.unmount()
      root.render(<Ticker />)
    })

    expect(store.getState().internal.active).toBe(true)
    // configure() skips scheduler registration while the root has an id, so a cancelled teardown
    // must leave the registration in place
    await act(async () => advance(1000, true, store.getState()))
    expect(frames).toHaveLength(1)

    await act(async () => root.unmount())
    expect(_roots.has(canvas)).toBe(false)
  })

  it('tears down a root whose configure failed before creating its scene', async () => {
    const canvas = document.createElement('canvas')
    const root = createRoot(canvas)
    // The renderer is built, then the camera props throw (zoom is a number and cannot be pierced),
    // before the scene or the XR manager exist
    await expect(root.configure({ renderer: {}, camera: { 'zoom-x': 1 } as any, frameloop: 'never' })).rejects.toThrow()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await act(async () => root.unmount())
    expect(_roots.has(canvas)).toBe(false)
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('teardown may be incomplete'), expect.anything())
  })

  it('does not revive an unmounted root through its old handle', async () => {
    const canvas = document.createElement('canvas')
    const root = createRoot(canvas)
    const onCreated = vi.fn()
    let store!: ReturnType<typeof root.render>
    await act(async () => {
      store = (await root.configure({ renderer: {}, frameloop: 'never', onCreated })).render(null)
    })
    await act(async () => root.unmount())

    await act(async () => root.render(null))
    expect(onCreated).toHaveBeenCalledTimes(1)
    expect(store.getState().internal.active).toBe(false)
    await expect(root.configure({ renderer: {} })).rejects.toThrow('after it has unmounted')

    // Nor may it unmount a newer root on the same canvas
    const next = createRoot(canvas)
    await act(async () => (await next.configure({ renderer: {}, frameloop: 'never' })).render(null))
    await act(async () => root.unmount())
    expect(_roots.get(canvas)?.store.getState().internal.active).toBe(true)
  })

  it('finishes the teardown when a step throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const canvas = document.createElement('canvas')
    const root = createRoot(canvas)
    let store!: ReturnType<typeof root.render>
    await act(async () => {
      store = (await root.configure({ renderer: {}, frameloop: 'never' })).render(null)
    })
    store.getState().events.disconnect = () => {
      throw new Error('disconnect failed')
    }

    await act(async () => root.unmount())
    expect(_roots.has(canvas)).toBe(false)
    expect(store.getState().internal.unregisterRoot).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('teardown may be incomplete'), expect.any(Error))
  })
})
