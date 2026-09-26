/**
 * Renderer ownership on unmount.
 *
 * Regression for #3926: a WebGPURenderer that R3F built for `<Canvas renderer={{}} />` was never
 * disposed. Teardown released the scene, the events and the canvas target, but the renderer (and
 * with it the GPU device, the backend caches and the animation loop) outlived the root.
 *
 * The rule under test: R3F disposes the renderers it creates -- from a props bag or a factory --
 * once the last canvas rendering through them is gone, and never touches an instance the caller
 * passed in, which stays theirs to dispose. A primary and its secondaries count as consumers of
 * one renderer, and a root that is configured or rendered again before its unmount has flushed is
 * live, so its pending teardown is cancelled (#3869).
 *
 * Ported from port/3869-remount-claim-v10, where it tested #3927's implementation; it runs
 * unchanged against the renderer leases here.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { vi } from 'vitest'
import { getScheduler, Scheduler } from '@pmndrs/scheduler'

import { _roots, advance, createRoot, getPrimary, useFrame, type ReconcilerRoot } from '../src'

//* Mock Renderer ==============================
// Enough of WebGPURenderer for configure() and teardown; multi-canvas needs no GPU with
// `frameloop: 'never'` because the canvas-target job never runs.

class MockWebGPURenderer {
  canvas: HTMLCanvasElement
  private _initialized = false
  backend = { isWebGPUBackend: true }
  shadowMap = { enabled: false, type: THREE.PCFSoftShadowMap }
  outputColorSpace = THREE.SRGBColorSpace
  toneMapping = THREE.ACESFilmicToneMapping
  renderLists = { dispose: () => {} }
  xr = {
    enabled: false,
    isPresenting: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    setAnimationLoop: () => {},
  }

  constructor(params: { canvas: HTMLCanvasElement }) {
    this.canvas = params.canvas
  }

  async init() {
    this._initialized = true
  }

  hasInitialized() {
    return this._initialized
  }

  render() {}
  setSize() {}
  setPixelRatio() {}
  dispose = vi.fn()
}

//* Test Helpers ==============================

const size = { width: 320, height: 240, top: 0, left: 0 }

describe('renderer disposal on unmount', () => {
  const roots: ReconcilerRoot<HTMLCanvasElement>[] = []
  let testRun = 0
  let testPrefix: string

  beforeEach(() => {
    vi.useFakeTimers()
    Scheduler.reset()
    testPrefix = `dispose-${++testRun}`
  })

  afterEach(async () => {
    await act(async () => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    Scheduler.reset()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function newRoot() {
    const canvas = document.createElement('canvas')
    const root = createRoot(canvas)
    roots.push(root)
    return { canvas, root }
  }

  async function unmount(root: ReconcilerRoot<HTMLCanvasElement>) {
    await act(async () => root.unmount())
  }

  //* Single Canvas ==============================

  it('disposes a renderer built from a props bag on unmount', async () => {
    const { root } = newRoot()
    // The reporter's repro: `<Canvas renderer={{}} />` -- R3F constructs the WebGPURenderer.
    const store = await act(async () => (await root.configure({ renderer: {}, size, frameloop: 'never' })).render(null))
    const renderer = store.getState().renderer as WebGPURenderer
    expect(renderer).toBeInstanceOf(WebGPURenderer)
    const dispose = vi.spyOn(renderer, 'dispose')
    expect(dispose).not.toHaveBeenCalled()

    await unmount(root)
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('disposes a renderer built by a factory', async () => {
    const { root } = newRoot()
    let renderer!: MockWebGPURenderer
    await act(async () =>
      (
        await root.configure({
          renderer: (props: any) => (renderer = new MockWebGPURenderer(props)),
          size,
          frameloop: 'never',
        })
      ).render(null),
    )

    await unmount(root)
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('disposes once when a root is unmounted twice before its teardown flushes', async () => {
    const { root } = newRoot()
    let renderer!: MockWebGPURenderer
    await act(async () =>
      (
        await root.configure({
          renderer: (props: any) => (renderer = new MockWebGPURenderer(props)),
          size,
          frameloop: 'never',
        })
      ).render(null),
    )

    // Both a Canvas cleanup and an explicit root.unmount() can land on the same root.
    await act(async () => {
      root.unmount()
      root.unmount()
    })
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('disposes a renderer built for a root whose configure failed before creating its scene', async () => {
    const { root } = newRoot()
    let renderer!: MockWebGPURenderer
    // The renderer is built, then configure() throws on the camera props (zoom is a number, so it
    // cannot be pierced), before the scene exists.
    await expect(
      root.configure({
        renderer: (props: any) => (renderer = new MockWebGPURenderer(props)),
        camera: { 'zoom-x': 1 } as any,
        size,
        frameloop: 'never',
      }),
    ).rejects.toThrow()
    const warn = vi.spyOn(console, 'warn')

    await unmount(root)
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Error while unmounting root'), expect.anything())
  })

  it('disposes an owned renderer even when an earlier teardown step fails', async () => {
    const { root } = newRoot()
    let renderer!: MockWebGPURenderer
    const store = await act(async () =>
      (
        await root.configure({
          renderer: (props: any) => (renderer = new MockWebGPURenderer(props)),
          size,
          frameloop: 'never',
        })
      ).render(null),
    )
    store.getState().setEvents({
      disconnect: () => {
        throw new Error('disconnect failed')
      },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await unmount(root)
    // The failure is still reported, but it must not cost the GPU device.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Error while unmounting root'), expect.anything())
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('leaves a caller-supplied renderer instance alone', async () => {
    const { canvas, root } = newRoot()
    const renderer = new MockWebGPURenderer({ canvas })
    await act(async () => (await root.configure({ renderer, size, frameloop: 'never' })).render(null))

    await unmount(root)
    expect(renderer.dispose).not.toHaveBeenCalled()
  })

  it('leaves a caller-supplied instance alone even when R3F initialized it', async () => {
    const { canvas, root } = newRoot()
    const renderer = new MockWebGPURenderer({ canvas })
    expect(renderer.hasInitialized()).toBe(false)
    await act(async () => (await root.configure({ renderer, size, frameloop: 'never' })).render(null))
    expect(renderer.hasInitialized()).toBe(true)

    await unmount(root)
    // Calling init() is a favour, not a claim: the instance is still the caller's.
    expect(renderer.dispose).not.toHaveBeenCalled()
  })

  //* Multi-Canvas ==============================

  async function mountPrimary(id: string) {
    const { canvas, root } = newRoot()
    let renderer!: MockWebGPURenderer
    const store = await act(async () =>
      (
        await root.configure({
          id,
          renderer: (props: any) => (renderer = new MockWebGPURenderer(props)),
          size,
          frameloop: 'never',
        })
      ).render(null),
    )
    return { canvas, root, store, renderer }
  }

  async function mountSecondary(primaryCanvas: string, id: string) {
    const { canvas, root } = newRoot()
    const store = await act(async () =>
      (
        await root.configure({
          id,
          primaryCanvas,
          // As <Canvas renderer={{ primaryCanvas }}> arrives after parseRendererConfig.
          renderer: { primaryCanvas } as any,
          size,
          frameloop: 'never',
          scheduler: { after: primaryCanvas },
        })
      ).render(null),
    )
    return { canvas, root, store }
  }

  it('keeps a shared renderer while a secondary still renders through it, then disposes with the last', async () => {
    const mainId = `${testPrefix}-main`
    const primary = await mountPrimary(mainId)
    const secondary = await mountSecondary(mainId, `${testPrefix}-sec`)
    expect(secondary.store.getState().renderer).toBe(primary.renderer)

    await unmount(secondary.root)
    expect(primary.renderer.dispose).not.toHaveBeenCalled()

    await unmount(primary.root)
    expect(primary.renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('lets a secondary outlive its primary and disposes when that last consumer leaves', async () => {
    const mainId = `${testPrefix}-main`
    const primary = await mountPrimary(mainId)
    const secondary = await mountSecondary(mainId, `${testPrefix}-sec`)

    await unmount(primary.root)
    expect(primary.renderer.dispose).not.toHaveBeenCalled()

    await unmount(secondary.root)
    expect(primary.renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('never disposes a caller-supplied renderer shared across canvases', async () => {
    const mainId = `${testPrefix}-main`
    const { canvas, root } = newRoot()
    const renderer = new MockWebGPURenderer({ canvas })
    await act(async () => (await root.configure({ id: mainId, renderer, size, frameloop: 'never' })).render(null))
    const secondary = await mountSecondary(mainId, `${testPrefix}-sec`)

    await unmount(secondary.root)
    await unmount(root)
    expect(renderer.dispose).not.toHaveBeenCalled()
  })

  //* Remount ==============================

  it('keeps a root that is configured and rendered again before its teardown', async () => {
    const { canvas, root } = newRoot()
    let renderer!: MockWebGPURenderer
    const rendererConfig = { renderer: (props: any) => (renderer = new MockWebGPURenderer(props)) }
    const store = await act(async () =>
      (await root.configure({ ...rendererConfig, size, frameloop: 'never' })).render(null),
    )
    const entry = _roots.get(canvas)
    const rootId = store.getState().internal.rootId!
    expect(renderer.dispose).not.toHaveBeenCalled()
    expect(getScheduler().getRootIds()).toContain(rootId)

    const frames: number[] = []
    function Ticker() {
      useFrame(() => void frames.push(1))
      return null
    }

    // Reusing the canvas before the unmount has flushed, as a remounting <Canvas> does, picks the
    // same root, store and renderer back up and cancels the pending teardown.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let remounted!: ReconcilerRoot<HTMLCanvasElement>
    await act(async () => {
      root.unmount()
      remounted = createRoot(canvas)
      roots.push(remounted)
      ;(await remounted.configure({ ...rendererConfig, size, frameloop: 'never' })).render(<Ticker />)
    })
    expect(warn).toHaveBeenCalledWith('R3F.createRoot should only be called once!')
    expect(store.getState().renderer).toBe(renderer)

    // Nothing is left on a timer: the old 500 ms grace period must not tear the live root down.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(renderer.dispose).not.toHaveBeenCalled()
    expect(_roots.get(canvas)).toBe(entry)
    expect(store.getState().internal.active).toBe(true)

    // The root is still scheduled (v10 unregisters it from the scheduler only in the teardown).
    expect(getScheduler().getRootIds()).toContain(rootId)
    await act(async () => advance(1000, true, store.getState()))
    expect(frames).toHaveLength(1)

    // The cancelled teardown does not stop a later, real one.
    await unmount(remounted)
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
    expect(_roots.get(canvas)).toBeUndefined()
    expect(getScheduler().getRootIds()).not.toContain(rootId)
  })

  //* Unmount During Renderer Setup ==============================

  it('releases a renderer whose setup finishes after its root was unmounted', async () => {
    const { root } = newRoot()
    const id = `${testPrefix}-slow`
    let renderer!: MockWebGPURenderer
    let finishSetup!: () => void
    // An async factory stands in for a slow WebGPU init (adapter/device request).
    const gate = new Promise<void>((resolve) => (finishSetup = resolve))
    const configured = root.configure({
      id,
      renderer: async (props: any) => {
        await gate
        return (renderer = new MockWebGPURenderer(props))
      },
      size,
      frameloop: 'always',
    })
    const rootIdsBefore = getScheduler().getRootIds()
    const warn = vi.spyOn(console, 'warn')

    // The Canvas goes away while its renderer is still being built; the teardown flushes first.
    await unmount(root)

    await act(async () => {
      finishSetup()
      await configured
    })

    // Nothing the late setup produced may outlive the root: not the renderer, not a scheduler
    // root rendering into a dead canvas, not a registry entry secondaries could attach to.
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
    expect(getScheduler().getRootIds()).toEqual(rootIdsBefore)
    expect(getPrimary(id)).toBeUndefined()
    // A root without a scene yet releases cleanly rather than failing halfway through.
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Error while unmounting root'), expect.anything())
  })

  it('lets go of a primary when its secondary was unmounted while still waiting for it', async () => {
    const mainId = `${testPrefix}-main`
    const { root: secondaryRoot } = newRoot()
    // The secondary mounts first and waits for its primary to register.
    const secondaryConfigured = secondaryRoot.configure({
      primaryCanvas: mainId,
      renderer: { primaryCanvas: mainId } as any,
      size,
      frameloop: 'never',
    })
    await unmount(secondaryRoot)

    const primary = await mountPrimary(mainId)
    await act(async () => {
      await secondaryConfigured
    })

    // The unmounted secondary must not hold the primary's renderer open.
    await unmount(primary.root)
    expect(primary.renderer.dispose).toHaveBeenCalledTimes(1)
  })
})
