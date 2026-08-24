/**
 * @fileoverview Per-canvas frameloop tests (#3852)
 *
 * Scheduler 0.2 keeps one shared RAF driver while moving lifecycle mode and pending
 * frames onto each root. R3F maps Canvas state to those native root controls:
 *
 *   1. Registration and imperative mode changes stay root-scoped.
 *   2. State invalidation and resize wake only the owning demand root.
 *   3. Stateless invalidation and advance retain their global fan-out contract.
 *   4. State-bound and XR advance step only the owning root.
 *   5. Unmount unregisters the scheduler root synchronously.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { vi } from 'vitest'
import { getScheduler, Scheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { createRoot, useFrame, invalidate, advance, extend } from '../src'

extend(THREE as any)

//* Deterministic RAF Controller ==============================

function createRafController() {
  const callbacks = new Map<number, FrameRequestCallback>()
  let nextId = 1

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId++
    callbacks.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id))

  return {
    flush(timestamp: number) {
      const queued = [...callbacks.values()]
      callbacks.clear()
      for (const callback of queued) callback(timestamp)
    },
    get size() {
      return callbacks.size
    },
  }
}

//* Mock Renderer ==============================
// Minimal WebGPU-style mock (pattern from scheduler-integration.test.tsx).
// `render` is the observable signal for "R3F performed its default render".
class MockWebGPURenderer {
  canvas: HTMLCanvasElement
  animationLoop: XRFrameRequestCallback | null = null
  private _initialized = false
  private xrListeners = new Map<string, Set<() => void>>()
  shadowMap = { enabled: false, type: THREE.PCFSoftShadowMap }
  outputColorSpace = THREE.SRGBColorSpace
  toneMapping = THREE.ACESFilmicToneMapping
  xr = {
    enabled: false,
    isPresenting: false,
    addEventListener: (type: string, callback: () => void) => {
      let listeners = this.xrListeners.get(type)
      if (!listeners) this.xrListeners.set(type, (listeners = new Set()))
      listeners.add(callback)
    },
    removeEventListener: (type: string, callback: () => void) => {
      this.xrListeners.get(type)?.delete(callback)
    },
    setAnimationLoop: (callback: XRFrameRequestCallback | null) => {
      this.animationLoop = callback
    },
  }
  backend = { isWebGPUBackend: true }
  renderLists = { dispose: () => {} }

  constructor(params?: { canvas?: HTMLCanvasElement }) {
    this.canvas = params?.canvas || document.createElement('canvas')
  }

  async init() {
    this._initialized = true
    return Promise.resolve()
  }
  hasInitialized() {
    return this._initialized
  }
  render(_scene: THREE.Scene, _camera: THREE.Camera) {}
  forceContextLoss() {}
  dispose() {}
  setSize() {}
  setPixelRatio() {}

  startXR() {
    this.xr.isPresenting = true
    for (const callback of this.xrListeners.get('sessionstart') ?? []) callback()
  }
}

describe('per-canvas frameloop (#3852)', () => {
  let canvasA: HTMLCanvasElement
  let canvasB: HTMLCanvasElement
  let rootA: ReturnType<typeof createRoot>
  let rootB: ReturnType<typeof createRoot>
  let raf: ReturnType<typeof createRafController>

  beforeEach(() => {
    Scheduler.reset()
    raf = createRafController()
    canvasA = createCanvas()
    canvasB = createCanvas()
    rootA = createRoot(canvasA)
    rootB = createRoot(canvasB)
  })

  afterEach(async () => {
    await act(async () => {
      rootA.unmount()
      rootB.unmount()
    })
    Scheduler.reset()
    vi.unstubAllGlobals()
  })

  function getRootId(store: { getState(): any }): string {
    return store.getState().internal.rootId
  }

  function Ticker({ frames }: { frames: number[] }) {
    useFrame(() => frames.push(1))
    return null
  }

  it('registers native per-root modes and lets an always sibling run while demand sleeps', async () => {
    const rendererA = new MockWebGPURenderer({ canvas: canvasA })
    const rendererB = new MockWebGPURenderer({ canvas: canvasB })
    const renderSpyA = vi.spyOn(rendererA, 'render')
    const renderSpyB = vi.spyOn(rendererB, 'render')
    const framesA: number[] = []
    const framesB: number[] = []

    const storeA = await act(async () =>
      (await rootA.configure({ renderer: rendererA, frameloop: 'always' })).render(<Ticker frames={framesA} />),
    )
    const storeB = await act(async () =>
      (await rootB.configure({ renderer: rendererB, frameloop: 'demand' })).render(<Ticker frames={framesB} />),
    )

    const scheduler = getScheduler()
    expect(scheduler.getRootFrameloop(getRootId(storeA))).toBe('always')
    expect(scheduler.getRootFrameloop(getRootId(storeB))).toBe('demand')

    // Drain the demand root's mount invalidation, then observe one idle frame.
    await act(async () => raf.flush(1000))
    renderSpyA.mockClear()
    renderSpyB.mockClear()
    framesA.length = 0
    framesB.length = 0
    await act(async () => raf.flush(1016))

    expect(renderSpyA).toHaveBeenCalledTimes(1)
    expect(framesA).toHaveLength(1)
    expect(renderSpyB).not.toHaveBeenCalled()
    expect(framesB).toHaveLength(0)
    expect(raf.size).toBe(1)
  })

  it('updates only the owning root when setFrameloop is called imperatively', async () => {
    const storeA = await act(async () =>
      (
        await rootA.configure({
          renderer: new MockWebGPURenderer({ canvas: canvasA }),
          frameloop: 'always',
        })
      ).render(<mesh />),
    )
    const storeB = await act(async () =>
      (
        await rootB.configure({
          renderer: new MockWebGPURenderer({ canvas: canvasB }),
          frameloop: 'demand',
        })
      ).render(<mesh />),
    )
    const scheduler = getScheduler()
    const rootIdA = getRootId(storeA)
    const rootIdB = getRootId(storeB)

    await act(async () => storeA.getState().setFrameloop('never'))
    expect(scheduler.getRootFrameloop(rootIdA)).toBe('never')
    expect(scheduler.getRootFrameloop(rootIdB)).toBe('demand')

    await act(async () => storeB.getState().setFrameloop('always'))
    expect(scheduler.getRootFrameloop(rootIdA)).toBe('never')
    expect(scheduler.getRootFrameloop(rootIdB)).toBe('always')
  })

  it('targets state invalidation and fans stateless invalidation out to every demand root', async () => {
    const rendererA = new MockWebGPURenderer({ canvas: canvasA })
    const rendererB = new MockWebGPURenderer({ canvas: canvasB })
    const renderSpyA = vi.spyOn(rendererA, 'render')
    const renderSpyB = vi.spyOn(rendererB, 'render')
    const framesA: number[] = []
    const framesB: number[] = []

    const storeA = await act(async () =>
      (await rootA.configure({ renderer: rendererA, frameloop: 'demand' })).render(<Ticker frames={framesA} />),
    )
    await act(async () =>
      (await rootB.configure({ renderer: rendererB, frameloop: 'demand' })).render(<Ticker frames={framesB} />),
    )

    await act(async () => raf.flush(1000))
    renderSpyA.mockClear()
    renderSpyB.mockClear()
    framesA.length = 0
    framesB.length = 0

    await act(async () => {
      storeA.getState().invalidate()
      raf.flush(1016)
    })
    expect(renderSpyA).toHaveBeenCalledTimes(1)
    expect(framesA).toHaveLength(1)
    expect(renderSpyB).not.toHaveBeenCalled()
    expect(framesB).toHaveLength(0)

    await act(async () => {
      invalidate()
      raf.flush(1032)
    })
    expect(renderSpyA).toHaveBeenCalledTimes(2)
    expect(framesA).toHaveLength(2)
    expect(renderSpyB).toHaveBeenCalledTimes(1)
    expect(framesB).toHaveLength(1)
  })

  it('targets state-bound advance while stateless advance still steps every root', async () => {
    const framesA: number[] = []
    const framesB: number[] = []
    const storeA = await act(async () =>
      (
        await rootA.configure({
          renderer: new MockWebGPURenderer({ canvas: canvasA }),
          frameloop: 'never',
        })
      ).render(<Ticker frames={framesA} />),
    )
    await act(async () =>
      (
        await rootB.configure({
          renderer: new MockWebGPURenderer({ canvas: canvasB }),
          frameloop: 'never',
        })
      ).render(<Ticker frames={framesB} />),
    )

    await act(async () => advance(1000, true, storeA.getState()))
    expect(framesA).toHaveLength(1)
    expect(framesB).toHaveLength(0)

    await act(async () => advance(1016))
    expect(framesA).toHaveLength(2)
    expect(framesB).toHaveLength(1)
  })

  it('invalidates only the owning demand root through imperative and configured resize paths', async () => {
    const rendererA = new MockWebGPURenderer({ canvas: canvasA })
    const rendererB = new MockWebGPURenderer({ canvas: canvasB })
    const renderSpyA = vi.spyOn(rendererA, 'render')
    const renderSpyB = vi.spyOn(rendererB, 'render')

    const storeA = await act(async () =>
      (await rootA.configure({ renderer: rendererA, frameloop: 'demand' })).render(<mesh />),
    )
    await act(async () => (await rootB.configure({ renderer: rendererB, frameloop: 'demand' })).render(<mesh />))

    await act(async () => raf.flush(1000))
    renderSpyA.mockClear()
    renderSpyB.mockClear()

    await act(async () => {
      storeA.getState().setSize(640, 480)
      raf.flush(1016)
    })
    expect(renderSpyA).toHaveBeenCalledTimes(1)
    expect(renderSpyB).not.toHaveBeenCalled()

    await act(async () => {
      await rootA.configure({
        renderer: rendererA,
        frameloop: 'demand',
        size: { width: 800, height: 600, top: 0, left: 0 },
      })
      raf.flush(1032)
    })
    expect(renderSpyA).toHaveBeenCalledTimes(2)
    expect(renderSpyB).not.toHaveBeenCalled()
  })

  it('steps only the presenting root from the XR animation loop', async () => {
    const rendererA = new MockWebGPURenderer({ canvas: canvasA })
    const rendererB = new MockWebGPURenderer({ canvas: canvasB })
    const framesA: number[] = []
    const framesB: number[] = []

    await act(async () =>
      (await rootA.configure({ renderer: rendererA, frameloop: 'always' })).render(<Ticker frames={framesA} />),
    )
    await act(async () =>
      (await rootB.configure({ renderer: rendererB, frameloop: 'always' })).render(<Ticker frames={framesB} />),
    )

    await act(async () => raf.flush(1000))
    framesA.length = 0
    framesB.length = 0
    getScheduler().stop()

    rendererA.startXR()
    expect(rendererA.animationLoop).not.toBeNull()
    await act(async () => rendererA.animationLoop?.(1016, {} as XRFrame))

    expect(framesA).toHaveLength(1)
    expect(framesB).toHaveLength(0)
  })

  it('unregisters the scheduler root immediately when a Canvas unmounts', async () => {
    const storeA = await act(async () =>
      (
        await rootA.configure({
          renderer: new MockWebGPURenderer({ canvas: canvasA }),
          frameloop: 'demand',
        })
      ).render(<mesh />),
    )
    const storeB = await act(async () =>
      (
        await rootB.configure({
          renderer: new MockWebGPURenderer({ canvas: canvasB }),
          frameloop: 'demand',
        })
      ).render(<mesh />),
    )
    const scheduler = getScheduler()
    const rootIdA = getRootId(storeA)
    const rootIdB = getRootId(storeB)

    expect(scheduler.getRootIds()).toEqual([rootIdA, rootIdB])
    await act(async () => rootA.unmount())

    expect(scheduler.getRootIds()).toEqual([rootIdB])
  })
})
