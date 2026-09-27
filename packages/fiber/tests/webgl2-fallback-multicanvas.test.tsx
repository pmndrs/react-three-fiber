/**
 * Multi-canvas when the primary fell back to the WebGL2 backend (#3965).
 *
 * three's WebGPURenderer silently falls back to its WebGL2 backend when
 * navigator.gpu is unavailable. A WebGL context is bound to the canvas element it
 * was created on, so `setCanvasTarget` cannot redirect it onto a secondary's
 * element: the shared renderer kept drawing the secondary's scene into the
 * primary's canvas and the secondary stayed blank.
 *
 * A secondary whose primary fell back therefore creates its own renderer (which
 * takes the same fallback) and renders independently, while a WebGPU secondary
 * keeps sharing the primary's renderer through a CanvasTarget.
 *
 * No GPU: the renderer is a mock, but one that keeps three's real contract
 * (backend identity flags, the own default canvas target, target-implicit
 * sizing), because the branch point lives in that contract.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { CanvasTarget } from 'three/webgpu'
import { vi } from 'vitest'
import { getScheduler, Scheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { createRoot } from '../src'

//* Mock Renderer ==============================

class MockRenderer {
  canvas: HTMLCanvasElement
  /** What the renderer's own target measured at the moment GPU resources would be created. */
  sizeAtInit: { width: number; height: number; dpr: number } | null = null
  /** The backend the environment picked: `isWebGPUBackend` (WebGPU) or `isWebGLBackend` (fallback). */
  backend: Record<string, unknown>
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

  constructor(params: { canvas: HTMLCanvasElement; webgpu?: boolean }) {
    this.canvas = params.canvas
    // three sets exactly one identity flag on the backend it picked; r3f detects the
    // fallback by isWebGPUBackend being absent (renderer.tsx, primary path).
    this.backend = params.webgpu === false ? { isWebGLBackend: true } : { isWebGPUBackend: true }
    // As three's Renderer constructor does: one target around the element, flagged as default.
    this._canvasTarget = new CanvasTarget(params.canvas)
    // three's CanvasTarget type lacks the default-target flag the assertions rely on.
    ;(this._canvasTarget as CanvasTarget & { isDefaultCanvasTarget?: boolean }).isDefaultCanvasTarget = true
  }

  async init() {
    const size = this._canvasTarget.getSize(new THREE.Vector2())
    this.sizeAtInit = { width: size.x, height: size.y, dpr: this._canvasTarget.getPixelRatio() }
    this._initialized = true
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

  private _onCanvasTargetResize = () => {}

  setSize(width: number, height: number, updateStyle?: boolean) {
    this._canvasTarget.setSize(width, height, updateStyle)
  }

  setPixelRatio(value: number) {
    this._canvasTarget.setPixelRatio(value)
  }

  render = vi.fn()
  dispose() {}
  forceContextLoss() {}
}

//* Test Helpers ==============================

type TestRoot = ReturnType<typeof createRoot>

describe('multi-canvas under the WebGL2 fallback', () => {
  const roots: TestRoot[] = []
  let testRun = 0
  let testPrefix: string

  beforeEach(() => {
    Scheduler.reset()
    testPrefix = `webgl2-fallback-${++testRun}`
  })

  afterEach(async () => {
    await act(async () => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    Scheduler.reset()
    vi.restoreAllMocks()
  })

  async function mountPrimary(id: string, { fallback }: { fallback?: boolean } = {}) {
    const canvas = createCanvas()
    const renderer = new MockRenderer({ canvas, webgpu: !fallback })
    const root = createRoot(canvas)
    roots.push(root)
    const store = await act(async () =>
      (await root.configure({ id, renderer, size, dpr: 1, frameloop: 'never' })).render(<mesh />),
    )
    return { canvas, renderer, root, store }
  }

  async function mountSecondary(primaryCanvas: string, { fallback }: { fallback?: boolean } = {}) {
    const canvas = createCanvas()
    // The secondary's own renderer: what r3f must construct when the primary fell
    // back. Handed over like renderer options; resolveRenderer accepts an instance.
    const renderer = new MockRenderer({ canvas, webgpu: !fallback })
    const root = createRoot(canvas)
    roots.push(root)
    const store = await act(async () =>
      (
        await root.configure({
          primaryCanvas,
          renderer,
          size: { width: 320, height: 240, top: 0, left: 0 },
          dpr: 1,
          frameloop: 'never',
          scheduler: { after: primaryCanvas },
        })
      ).render(<mesh />),
    )
    return { canvas, renderer, root, store }
  }

  const size = { width: 640, height: 480, top: 0, left: 0 }

  it('a fallback secondary renders through its own renderer, not the primary\u2019s', async () => {
    const mainId = `${testPrefix}-main`
    const primary = await mountPrimary(mainId, { fallback: true })
    const secondary = await mountSecondary(mainId, { fallback: true })

    expect(primary.store.getState().webGPUSupported).toBe(false)

    const actual = secondary.store.getState().internal.actualRenderer
    expect(actual).toBe(secondary.renderer)
    expect(actual).not.toBe(primary.renderer)

    getScheduler().step(1000)

    // Each canvas\u2019s frame goes through its own renderer: the primary\u2019s is asked for
    // exactly one frame, and it is never fed the secondary\u2019s scene.
    expect(secondary.renderer.render).toHaveBeenCalled()
    expect(primary.renderer.render).toHaveBeenCalledTimes(1)
  })

  it('never re-points the primary\u2019s renderer at a canvas its context cannot draw to', async () => {
    const mainId = `${testPrefix}-main`
    const primary = await mountPrimary(mainId, { fallback: true })
    const secondary = await mountSecondary(mainId, { fallback: true })

    getScheduler().step(1000)
    getScheduler().step(1016)

    // Before the fix, the secondary\u2019s start-phase job swapped the shared renderer\u2019s
    // canvas target onto a wrapper around the secondary\u2019s element -- a target the
    // WebGL context could never present to.
    expect(primary.renderer.setCanvasTarget).not.toHaveBeenCalled()
    expect(secondary.renderer.setCanvasTarget).not.toHaveBeenCalled()
  })

  it('the fallback secondary owns its renderer\u2019s default target around its own element', async () => {
    const mainId = `${testPrefix}-main`
    const primary = await mountPrimary(mainId, { fallback: true })
    const secondary = await mountSecondary(mainId, { fallback: true })

    const canvasTarget = secondary.store.getState().internal.canvasTarget!
    expect(canvasTarget).toBe(secondary.renderer.getCanvasTarget())
    expect(canvasTarget.domElement).toBe(secondary.canvas)

    // The primary was never told it is multi-canvas: nothing will ever swap its target.
    expect(primary.store.getState().internal.isMultiCanvas).toBeFalsy()
  })

  it('sizes its own renderer to its own canvas before init creates GPU resources', async () => {
    const mainId = `${testPrefix}-main`
    await mountPrimary(mainId, { fallback: true })
    const secondary = await mountSecondary(mainId, { fallback: true })

    expect(secondary.renderer.sizeAtInit).toEqual({ width: 320, height: 240, dpr: 1 })
  })

  it('keeps TSL state local and never offers its renderer as a shareable primary', async () => {
    const mainId = `${testPrefix}-main`
    await mountPrimary(mainId, { fallback: true })
    const secondary = await mountSecondary(mainId, { fallback: true })

    const state = secondary.store.getState()
    // GPU resources cannot cross GL contexts, so the secondary is its own primary.
    expect(state.primaryStore).toBe(secondary.store)
    expect(state.internal.isSecondary).toBe(true)
    expect(state.internal.targetId).toBe(mainId)
  })

  it('a WebGPU secondary still shares the primary\u2019s renderer', async () => {
    const mainId = `${testPrefix}-main`
    const primary = await mountPrimary(mainId)
    const secondary = await mountSecondary(mainId)

    expect(primary.store.getState().webGPUSupported).toBe(true)

    const state = secondary.store.getState()
    expect(state.internal.actualRenderer).toBe(primary.renderer)
    expect(state.primaryStore).toBe(primary.store)
    expect(primary.store.getState().internal.isMultiCanvas).toBe(true)

    const canvasTarget = state.internal.canvasTarget!
    expect(canvasTarget).not.toBe(primary.renderer.getCanvasTarget())
    expect(canvasTarget.domElement).toBe(secondary.canvas)
  })
})
