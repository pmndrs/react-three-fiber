/**
 * A `<Canvas id>` with no secondaries — the ownership of the renderer's canvas target.
 *
 * Regression for the alpha.4 form of #3847. The multi-canvas resize fix made a primary size
 * `internal.canvasTarget` instead of the renderer, which was right for the target and wrong for
 * what the target was: a second `CanvasTarget` wrapped around the same element as the renderer's
 * own. three sizes its depth buffer from `renderer._canvasTarget`, listens for resizes on it and
 * only swaps it in `setCanvasTarget` — which R3F only called once a secondary had flipped
 * `isMultiCanvas`. So a lone primary sized a target the renderer never drew with: the swap chain
 * followed the layout, the depth buffer stayed at the element's construction size, and every
 * frame raised
 *
 *   GPUValidationError: The depth stencil attachment [depthBuffer] size (300, 150) does not
 *   match the size of the other attachments' base plane (1288, 1196).
 *
 * The primary's target is now the renderer's own default target, so there is one target per
 * canvas element and sizing it is sizing the renderer.
 *
 * No GPU: the renderer is a mock, but one that keeps three's real contract with CanvasTarget
 * (target-implicit sizing, the drawing buffer read from the active target, the resize listener
 * moving with `setCanvasTarget`), because the bug lives entirely in that contract.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { CanvasTarget } from 'three/webgpu'
import { vi } from 'vitest'
import { getScheduler, Scheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { createRoot, extend } from '../src'

extend(THREE)

//* Mock Renderer ==============================

class MockWebGPURenderer {
  canvas: HTMLCanvasElement
  /** What the renderer's own target measured at the moment GPU resources would be created. */
  sizeAtInit: { width: number; height: number; dpr: number } | null = null
  backend = { isWebGPUBackend: true, updateSize: vi.fn() }
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
  private _initialized = false
  private _canvasTarget: CanvasTarget

  constructor(params: { canvas: HTMLCanvasElement }) {
    this.canvas = params.canvas
    // As three's Renderer constructor does: one target around the element, flagged as default.
    this._canvasTarget = new CanvasTarget(params.canvas)
    ;(this._canvasTarget as any).isDefaultCanvasTarget = true
    this._canvasTarget.addEventListener('resize', this._onCanvasTargetResize)
  }

  private _onCanvasTargetResize = () => {
    if (this._initialized) this.backend.updateSize()
  }

  async init() {
    const size = this._canvasTarget.getSize(new THREE.Vector2())
    this.sizeAtInit = { width: size.x, height: size.y, dpr: this._canvasTarget.getPixelRatio() }
    this._initialized = true
    this.backend.updateSize()
  }

  hasInitialized() {
    return this._initialized
  }

  getCanvasTarget() {
    return this._canvasTarget
  }

  setCanvasTarget = vi.fn((target: CanvasTarget) => {
    this._canvasTarget.removeEventListener('resize', this._onCanvasTargetResize)
    this._canvasTarget = target
    this._canvasTarget.addEventListener('resize', this._onCanvasTargetResize)
  })

  setSize(width: number, height: number, updateStyle?: boolean) {
    this._canvasTarget.setSize(width, height, updateStyle)
  }

  setPixelRatio(value: number) {
    this._canvasTarget.setPixelRatio(value)
  }

  getDrawingBufferSize() {
    return this._canvasTarget.getDrawingBufferSize(new THREE.Vector2())
  }

  render() {}
  dispose() {}
  forceContextLoss() {}
}

//* Test Helpers ==============================

type TestRoot = ReturnType<typeof createRoot>

describe('a primary canvas owns the renderer default target', () => {
  const roots: TestRoot[] = []
  let testRun = 0
  let testPrefix: string

  beforeEach(() => {
    Scheduler.reset()
    testPrefix = `primary-target-${++testRun}`
  })

  afterEach(async () => {
    await act(async () => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    Scheduler.reset()
    vi.restoreAllMocks()
  })

  /** A canvas the size of the reported repro (1288x1196 at dpr 2). */
  const size = { width: 644, height: 598, top: 0, left: 0 }

  async function mountPrimary(id: string) {
    const canvas = createCanvas()
    const renderer = new MockWebGPURenderer({ canvas })
    const root = createRoot(canvas)
    roots.push(root)
    const store = await act(async () =>
      (await root.configure({ id, renderer, size, dpr: 2, frameloop: 'never' })).render(<mesh />),
    )
    return { canvas, renderer, root, store }
  }

  async function mountSecondary(primaryCanvas: string, id: string) {
    const canvas = createCanvas()
    const root = createRoot(canvas)
    roots.push(root)
    // As <Canvas renderer={{ primaryCanvas }}> arrives after parseRendererConfig: the bag is
    // peeled, and the original prop stays as the (truthy, unused) renderer config.
    const rendererProp = { primaryCanvas }
    const store = await act(async () =>
      (
        await root.configure({
          id,
          primaryCanvas,
          renderer: rendererProp as any,
          size: { width: 320, height: 240, top: 0, left: 0 },
          dpr: 1,
          frameloop: 'never',
          scheduler: { after: primaryCanvas },
        })
      ).render(<mesh />),
    )
    return { canvas, root, store }
  }

  it("uses the renderer's own default target as its canvas target, not a second wrapper", async () => {
    const { renderer, store } = await mountPrimary(`${testPrefix}-main`)

    const { canvasTarget } = store.getState().internal
    expect(canvasTarget).toBe(renderer.getCanvasTarget())
    expect((canvasTarget as any).isDefaultCanvasTarget).toBe(true)
  })

  it('sizes the renderer, not just the element, before init creates GPU resources', async () => {
    const { renderer } = await mountPrimary(`${testPrefix}-main`)

    // The depth buffer is allocated from the target's logical size x pixel ratio. Writing
    // canvas.width/height directly, as the pre-init step used to, left this at 300x150 / 1.
    expect(renderer.sizeAtInit).toEqual({ width: 644, height: 598, dpr: 2 })
  })

  it('lands the initial size on the drawing buffer the depth attachment is built from', async () => {
    const { renderer } = await mountPrimary(`${testPrefix}-main`)

    // (The element's own width/height are pinned by the test canvas mock, so the target's
    // drawing buffer is the observable here -- and it is what three sizes the depth buffer from.)
    expect(renderer.getDrawingBufferSize()).toEqual(new THREE.Vector2(1288, 1196))
  })

  it('resizes through the renderer and lets three flush its descriptor synchronously', async () => {
    const { renderer, store } = await mountPrimary(`${testPrefix}-main`)
    renderer.backend.updateSize.mockClear()

    await act(async () => {
      store.getState().setSize(700, 500)
    })

    expect(renderer.getDrawingBufferSize()).toEqual(new THREE.Vector2(1400, 1000))
    expect(renderer.backend.updateSize).toHaveBeenCalled()
    // Heard by three's own listener, so no deferred flush is owed.
    expect(store.getState().internal.canvasTargetSizeDirty).toBeFalsy()
  })

  it('never swaps targets while it is the only canvas', async () => {
    const { renderer } = await mountPrimary(`${testPrefix}-main`)

    getScheduler().step(1000)
    getScheduler().step(1016)

    // The default target is already active; a redundant setCanvasTarget would only churn the
    // resize listener.
    expect(renderer.setCanvasTarget).not.toHaveBeenCalled()
  })

  it('takes the renderer back from a secondary each frame, then flushes a resize it missed', async () => {
    const mainId = `${testPrefix}-main`
    const { renderer, store } = await mountPrimary(mainId)
    const secondary = await mountSecondary(mainId, `${testPrefix}-sec`)
    const secondaryTarget = secondary.store.getState().internal.canvasTarget!

    // The secondary got its own target around its own element.
    expect(secondaryTarget).not.toBe(renderer.getCanvasTarget())
    expect(secondaryTarget.domElement).toBe(secondary.canvas)

    // The secondary runs after the primary and leaves its target active.
    getScheduler().step(1000)
    expect(renderer.getCanvasTarget()).toBe(secondaryTarget)

    // Resizing the primary while inactive: nothing hears it, so a flush is owed ...
    renderer.backend.updateSize.mockClear()
    await act(async () => {
      store.getState().setSize(700, 500)
    })
    expect(store.getState().internal.canvasTargetSizeDirty).toBe(true)
    expect(renderer.backend.updateSize).not.toHaveBeenCalled()
    // ... and the secondary's target was not resized to the primary's dimensions (#3847 bug 1).
    expect(store.getState().internal.canvasTarget!.getDrawingBufferSize(new THREE.Vector2())).toEqual(
      new THREE.Vector2(1400, 1000),
    )
    expect(secondaryTarget.getDrawingBufferSize(new THREE.Vector2())).toEqual(new THREE.Vector2(320, 240))

    // ... which the primary's start-phase job pays, right after making its target active.
    getScheduler().step(1016)
    expect(renderer.setCanvasTarget).toHaveBeenCalledWith(store.getState().internal.canvasTarget)
    expect(renderer.backend.updateSize).toHaveBeenCalled()
    expect(store.getState().internal.canvasTargetSizeDirty).toBe(false)
  })
})
