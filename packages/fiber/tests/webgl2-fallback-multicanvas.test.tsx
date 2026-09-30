/**
 * Multi-canvas when the primary fell back to the WebGL2 backend (#3965).
 *
 * three's WebGPURenderer silently falls back to its WebGL2 backend when
 * navigator.gpu is unavailable. A WebGL context is bound to the canvas element it
 * was created on, so `setCanvasTarget` cannot redirect it onto a secondary's
 * element: the shared renderer kept drawing the secondary's scene into the
 * primary's canvas and the secondary stayed blank.
 *
 * A secondary whose primary fell back therefore creates its own renderer (forced onto
 * the same WebGL2 backend) and renders independently as a standalone root, while a
 * WebGPU secondary keeps sharing the primary's renderer through a CanvasTarget.
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
import { createRoot as createRootWithProvider } from '../src/core/renderer'

import type { RendererProvider, WebGPUSupport } from '../types/provider'

//* Mock Renderer ==============================

class MockRenderer {
  /** Constructor params, as three's Renderer receives them. */
  receivedParams: Record<string, unknown>
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
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAnimationLoop: () => {},
  }
  private _initialized = false
  private _canvasTarget: CanvasTarget
  constructor(params: { canvas: HTMLCanvasElement; webgpu?: boolean; forceWebGL?: boolean } & Record<string, unknown>) {
    this.receivedParams = params
    this.canvas = params.canvas
    // three sets exactly one identity flag on the backend it picked; r3f detects the
    // fallback by isWebGPUBackend being absent (renderer.tsx, primary path). An explicit
    // `webgpu: true/false` from the test pins the backend; without it, WebGPU is picked
    // only when the environment has navigator.gpu or nothing forces WebGL, mirroring
    // three's WebGPUBackend -> WebGLBackend fallback.
    const wantsWebGPU =
      params.webgpu === true || (params.webgpu !== false && !params.forceWebGL && typeof navigator.gpu !== 'undefined')
    this.backend = wantsWebGPU ? { isWebGPUBackend: true } : { isWebGLBackend: true }
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
  dispose = vi.fn()
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
    // It owns its renderer, so it is NOT flagged as a borrowing secondary: teardown
    // neither disposes the renderer's own default canvas target nor skips XR.
    expect(state.internal.isSecondary).toBeFalsy()
    expect(state.internal.targetId).toBeUndefined()
    expect(state.internal.sharedRendererFallback).toBe(true)
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

  it('constructs the fallback renderer through the real configure path; teardown never disposes its default target', async () => {
    const mainId = `${testPrefix}-real`
    // A provider whose Renderer is the mock: core runs its real construction path
    // The mock support carries only what the construction path reads (kind, three for JSX
    // catalogue, Renderer, CanvasTarget); the remaining WebGPUSupport fields are only used
    // by occlusion/useRenderTarget, which these roots never enable. One unchecked cast.
    const mockSupport = {
      kind: 'webgpu',
      three: THREE,
      Renderer: MockRenderer,
      RenderTarget: THREE.WebGLRenderTarget,
      CubeRenderTarget: THREE.WebGLCubeRenderTarget,
      CanvasTarget,
    } as unknown as WebGPUSupport
    const provider: RendererProvider = { webgpu: async () => mockSupport }

    const primaryCanvas = createCanvas()
    const primaryRoot = createRootWithProvider(primaryCanvas, provider)
    roots.push(primaryRoot)
    const primaryStore = await act(async () =>
      (await primaryRoot.configure({ id: mainId, size, dpr: 1, frameloop: 'never' })).render(<mesh />),
    )
    expect(primaryStore.getState().webGPUSupported).toBe(false)

    const secondaryCanvas = createCanvas()

    const secondaryRoot = createRootWithProvider(secondaryCanvas, provider)
    roots.push(secondaryRoot)
    const secondaryStore = await act(async () =>
      (
        await secondaryRoot.configure({
          primaryCanvas: mainId,
          size: { width: 320, height: 240, top: 0, left: 0 },
          dpr: 1,
          frameloop: 'never',
          scheduler: { after: mainId },
        })
      ).render(<mesh />),
    )

    const state = secondaryStore.getState()
    const owned = state.internal.actualRenderer as unknown as MockRenderer
    // Core constructed this renderer itself, forced onto the primary's WebGL2 backend.
    expect(owned).not.toBe(primaryStore.getState().internal.actualRenderer)
    expect(owned.receivedParams.forceWebGL).toBe(true)
    expect(owned.receivedParams.canvas).toBe(secondaryCanvas)
    expect(state.webGPUSupported).toBe(false)
    expect(state.internal.sharedRendererFallback).toBe(true)
    expect(state.internal.isSecondary).toBeFalsy()

    // The renderer's own default target: teardown must NOT dispose it, because this
    // root owns the renderer (a `isSecondary` root would have it disposed here).
    const defaultTarget = state.internal.canvasTarget!
    expect((defaultTarget as CanvasTarget & { isDefaultCanvasTarget?: boolean }).isDefaultCanvasTarget).toBe(true)
    let targetDisposed = 0
    const originalDispose = defaultTarget.dispose
    defaultTarget.dispose = (...args: Parameters<typeof originalDispose>) => {
      targetDisposed++
      return originalDispose.apply(defaultTarget, args)
    }

    await act(async () => secondaryRoot.unmount())
    // tsconfig's lib predates Promise.withResolvers; executor form until the target moves.
    await new Promise<void>((resolve) => setTimeout(resolve, 520))
    expect(targetDisposed).toBe(0)
  })

  //* Real configure path: the fallback secondary's lifetime ==============================
  // Core constructs every renderer here (a provider whose Renderer is the mock), so each one is
  // R3F-owned and leased: disposal, XR wiring and renderer-wide settings run as they do in an app.

  function mockProvider(): RendererProvider {
    const mockSupport = {
      kind: 'webgpu',
      three: THREE,
      Renderer: MockRenderer,
      RenderTarget: THREE.WebGLRenderTarget,
      CubeRenderTarget: THREE.WebGLCubeRenderTarget,
      CanvasTarget,
    } as unknown as WebGPUSupport
    return { webgpu: async () => mockSupport }
  }

  async function mountRealPair(
    id: string,
    {
      fallback = true,
      secondaryProps = {},
    }: { fallback?: boolean; secondaryProps?: Partial<Parameters<TestRoot['configure']>[0]> } = {},
  ) {
    const provider = mockProvider()

    const primaryRoot = createRootWithProvider(createCanvas(), provider)
    roots.push(primaryRoot)
    // Without navigator.gpu the mock picks the WebGL2 backend, as three does; `webgpu: true` pins
    // the WebGPU backend for the shared case
    const primaryStore = await act(async () =>
      (
        await primaryRoot.configure({
          id,
          renderer: fallback ? undefined : ({ webgpu: true } as any),
          size,
          dpr: 1,
          frameloop: 'never',
        })
      ).render(<mesh />),
    )

    const secondaryCanvas = createCanvas()
    const secondaryRoot = createRootWithProvider(secondaryCanvas, provider)
    roots.push(secondaryRoot)
    const secondaryStore = await act(async () =>
      (
        await secondaryRoot.configure({
          primaryCanvas: id,
          size: { width: 320, height: 240, top: 0, left: 0 },
          dpr: 1,
          frameloop: 'never',
          scheduler: { after: id },
          ...secondaryProps,
        })
      ).render(<mesh />),
    )

    return {
      primary: {
        root: primaryRoot,
        store: primaryStore,
        renderer: primaryStore.getState().internal.actualRenderer as unknown as MockRenderer,
      },
      secondary: {
        root: secondaryRoot,
        store: secondaryStore,
        canvas: secondaryCanvas,
        renderer: secondaryStore.getState().internal.actualRenderer as unknown as MockRenderer,
      },
    }
  }

  it('disposes the fallback secondary\u2019s own renderer exactly once on unmount, leaving the primary\u2019s alone', async () => {
    const { primary, secondary } = await mountRealPair(`${testPrefix}-lease`)
    expect(secondary.store.getState().internal.sharedRendererFallback).toBe(true)
    expect(secondary.renderer).not.toBe(primary.renderer)

    await act(async () => secondary.root.unmount())
    expect(secondary.renderer.dispose).toHaveBeenCalledTimes(1)
    expect(primary.renderer.dispose).not.toHaveBeenCalled()

    // A second unmount of the same handle must not release the lease again
    await act(async () => secondary.root.unmount())
    expect(secondary.renderer.dispose).toHaveBeenCalledTimes(1)

    await act(async () => primary.root.unmount())
    expect(primary.renderer.dispose).toHaveBeenCalledTimes(1)
    expect(secondary.renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('keeps a fallback secondary rendering after its primary unmounts', async () => {
    const { primary, secondary } = await mountRealPair(`${testPrefix}-outlive`)

    await act(async () => primary.root.unmount())
    expect(primary.renderer.dispose).toHaveBeenCalledTimes(1)
    // The secondary never borrowed the primary's renderer, so nothing of it goes with the primary
    expect(secondary.renderer.dispose).not.toHaveBeenCalled()

    secondary.renderer.render.mockClear()
    getScheduler().step(1000)
    expect(secondary.renderer.render).toHaveBeenCalledTimes(1)

    await act(async () => secondary.root.unmount())
    expect(secondary.renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('connects and disconnects the fallback secondary\u2019s XR listeners on its own renderer', async () => {
    const { primary, secondary } = await mountRealPair(`${testPrefix}-xr`)
    const xr = secondary.renderer.xr

    expect(xr.addEventListener).toHaveBeenCalledTimes(2)
    expect(xr.addEventListener.mock.calls.map(([type]) => type).sort()).toEqual(['sessionend', 'sessionstart'])
    expect(xr.removeEventListener).not.toHaveBeenCalled()
    // The primary wired its own listeners on its own renderer, once
    expect(primary.renderer.xr.addEventListener).toHaveBeenCalledTimes(2)

    await act(async () => secondary.root.unmount())
    expect(xr.removeEventListener).toHaveBeenCalledTimes(2)
    // The same handlers that were added are the ones removed
    for (const [type, handler] of xr.addEventListener.mock.calls) {
      expect(xr.removeEventListener).toHaveBeenCalledWith(type, handler)
    }
    expect(primary.renderer.xr.removeEventListener).not.toHaveBeenCalled()
  })

  it('a fallback secondary applies its own shadows and renderer props to the renderer it owns', async () => {
    const { primary, secondary } = await mountRealPair(`${testPrefix}-own-settings`, {
      secondaryProps: {
        shadows: 'variance',
        renderer: { toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.LinearSRGBColorSpace } as any,
      },
    })

    expect(secondary.store.getState().internal.isSecondary).toBeFalsy()
    expect(secondary.renderer.shadowMap.enabled).toBe(true)
    expect(secondary.renderer.shadowMap.type).toBe(THREE.VSMShadowMap)
    expect(secondary.renderer.toneMapping).toBe(THREE.NoToneMapping)
    expect(secondary.renderer.outputColorSpace).toBe(THREE.LinearSRGBColorSpace)

    // The primary's renderer keeps the primary's own configuration
    expect(primary.renderer.shadowMap.enabled).toBe(false)
    expect(primary.renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(primary.renderer.outputColorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('a shared WebGPU secondary leaves the primary\u2019s renderer settings alone (#3981)', async () => {
    const { primary, secondary } = await mountRealPair(`${testPrefix}-shared-settings`, {
      fallback: false,
      secondaryProps: {
        shadows: 'variance',
        renderer: { toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.LinearSRGBColorSpace } as any,
      },
    })

    expect(secondary.store.getState().internal.isSecondary).toBe(true)
    expect(secondary.renderer).toBe(primary.renderer)
    expect(primary.renderer.shadowMap.enabled).toBe(false)
    expect(primary.renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(primary.renderer.outputColorSpace).toBe(THREE.SRGBColorSpace)
    // Only the owner wired XR on the shared renderer
    expect(primary.renderer.xr.addEventListener).toHaveBeenCalledTimes(2)
  })
})
