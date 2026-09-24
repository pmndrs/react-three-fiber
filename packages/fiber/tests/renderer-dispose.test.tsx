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
 * one renderer, and a root that is configured again inside the unmount grace period is live, so
 * its pending teardown is dropped.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { vi } from 'vitest'
import { Scheduler } from '@pmndrs/scheduler'

import { _roots, createRoot, extend, type ReconcilerRoot } from '../src'

extend(THREE)

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

const UNMOUNT_GRACE_MS = 500
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
      await vi.advanceTimersByTimeAsync(UNMOUNT_GRACE_MS)
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

  async function unmountAndWait(root: ReconcilerRoot<HTMLCanvasElement>) {
    await act(async () => root.unmount())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNMOUNT_GRACE_MS)
    })
  }

  //* Single Canvas ==============================

  it('disposes a renderer built from a props bag once the grace period has passed', async () => {
    const { root } = newRoot()
    // The reporter's repro: `<Canvas renderer={{}} />` -- R3F constructs the WebGPURenderer.
    const store = await act(async () => (await root.configure({ renderer: {}, size, frameloop: 'never' })).render(null))
    const renderer = store.getState().renderer as WebGPURenderer
    expect(renderer).toBeInstanceOf(WebGPURenderer)
    const dispose = vi.spyOn(renderer, 'dispose')

    await act(async () => root.unmount())
    // Renderer disposal keeps the same grace period as the rest of teardown.
    expect(dispose).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNMOUNT_GRACE_MS)
    })
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

    await unmountAndWait(root)
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('disposes once when a root is unmounted twice before its teardown runs', async () => {
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
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNMOUNT_GRACE_MS)
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

    await unmountAndWait(root)
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

    await unmountAndWait(root)
    // The failure is still reported, but it must not cost the GPU device.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Error while unmounting root'), expect.anything())
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('leaves a caller-supplied renderer instance alone', async () => {
    const { canvas, root } = newRoot()
    const renderer = new MockWebGPURenderer({ canvas })
    await act(async () => (await root.configure({ renderer, size, frameloop: 'never' })).render(null))

    await unmountAndWait(root)
    expect(renderer.dispose).not.toHaveBeenCalled()
  })

  it('leaves a caller-supplied instance alone even when R3F initialized it', async () => {
    const { canvas, root } = newRoot()
    const renderer = new MockWebGPURenderer({ canvas })
    expect(renderer.hasInitialized()).toBe(false)
    await act(async () => (await root.configure({ renderer, size, frameloop: 'never' })).render(null))
    expect(renderer.hasInitialized()).toBe(true)

    await unmountAndWait(root)
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

    await unmountAndWait(secondary.root)
    expect(primary.renderer.dispose).not.toHaveBeenCalled()

    await unmountAndWait(primary.root)
    expect(primary.renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('lets a secondary outlive its primary and disposes when that last consumer leaves', async () => {
    const mainId = `${testPrefix}-main`
    const primary = await mountPrimary(mainId)
    const secondary = await mountSecondary(mainId, `${testPrefix}-sec`)

    await unmountAndWait(primary.root)
    expect(primary.renderer.dispose).not.toHaveBeenCalled()

    await unmountAndWait(secondary.root)
    expect(primary.renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('never disposes a caller-supplied renderer shared across canvases', async () => {
    const mainId = `${testPrefix}-main`
    const { canvas, root } = newRoot()
    const renderer = new MockWebGPURenderer({ canvas })
    await act(async () => (await root.configure({ id: mainId, renderer, size, frameloop: 'never' })).render(null))
    const secondary = await mountSecondary(mainId, `${testPrefix}-sec`)

    await unmountAndWait(secondary.root)
    await unmountAndWait(root)
    expect(renderer.dispose).not.toHaveBeenCalled()
  })

  //* Grace Period ==============================

  it('does not dispose a root that is configured again inside the grace period', async () => {
    const { canvas, root } = newRoot()
    let renderer!: MockWebGPURenderer
    const rendererConfig = { renderer: (props: any) => (renderer = new MockWebGPURenderer(props)) }
    await act(async () => (await root.configure({ ...rendererConfig, size, frameloop: 'never' })).render(null))
    expect(renderer.dispose).not.toHaveBeenCalled()

    await act(async () => root.unmount())

    // Reusing the canvas inside the window picks the same root, store and renderer back up.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const remounted = createRoot(canvas)
    expect(warn).toHaveBeenCalledWith('R3F.createRoot should only be called once!')
    await act(async () => (await remounted.configure({ ...rendererConfig, size, frameloop: 'never' })).render(null))
    expect(remounted.render(null).getState().renderer).toBe(renderer)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNMOUNT_GRACE_MS)
    })
    expect(renderer.dispose).not.toHaveBeenCalled()
    expect(_roots.get(canvas)).toBeDefined()

    // The cancelled teardown does not stop a later, real one.
    await unmountAndWait(remounted)
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
    expect(_roots.get(canvas)).toBeUndefined()
  })
})
