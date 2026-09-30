/**
 * A secondary that borrows the primary's renderer must not change renderer-wide state
 * (#3981, found while reviewing #3977).
 *
 * On the shared WebGPU path, the secondary's first configure() used to apply its own
 * (usually default) `shadows` setting, the sRGB/ACES defaults, and its `renderer` props
 * to the PRIMARY's renderer instance, and every secondary mount added sessionstart/
 * sessionend listeners to the primary's renderer that teardown (owner-only) never
 * removed. The owner alone configures a shared renderer; a borrowing secondary keeps
 * its per-canvas state (size, dpr, camera, scene, events) and nothing else.
 *
 * No GPU: the renderer is a mock, because the branch point is ownership, not rendering.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { vi } from 'vitest'
import { Scheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { createRoot } from '../src'

//* Mock Renderer ==============================

class SharedMockRenderer {
  canvas: HTMLCanvasElement
  shadowMap = { enabled: false, type: THREE.PCFShadowMap, needsUpdate: false }
  outputColorSpace: THREE.ColorSpace = THREE.SRGBColorSpace
  /** WebGPU-capable: the shared branch keys off the backend identity flag. */
  backend = { isWebGPUBackend: true }
  toneMapping: THREE.ToneMapping = THREE.ACESFilmicToneMapping
  /** XR manager, as three hangs it off the renderer. */
  xr = { addEventListener: vi.fn(), removeEventListener: vi.fn(), enabled: false, isPresenting: false }
  private _initialized = false

  constructor(params: { canvas: HTMLCanvasElement }) {
    this.canvas = params.canvas
  }

  async init() {
    this._initialized = true
  }

  hasInitialized() {
    return this._initialized
  }

  setPixelRatio = vi.fn()
  setSize = vi.fn()
  render = vi.fn()
  dispose() {}
}

type TestRoot = ReturnType<typeof createRoot>

const size = { width: 640, height: 480, top: 0, left: 0 }

describe('a borrowing secondary leaves the shared renderer alone', () => {
  const roots: TestRoot[] = []
  let testRun = 0
  let mainId: string

  beforeEach(() => {
    Scheduler.reset()
    mainId = `shared-owner-${++testRun}`
  })

  afterEach(async () => {
    await act(async () => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    Scheduler.reset()
    vi.restoreAllMocks()
  })

  async function mountPrimary() {
    const canvas = createCanvas()
    const renderer = new SharedMockRenderer({ canvas })
    const root = createRoot(canvas)
    roots.push(root)
    const store = await act(async () =>
      (await root.configure({ id: mainId, renderer, size, dpr: 1, frameloop: 'never', shadows: true })).render(
        <mesh />,
      ),
    )
    return { canvas, renderer, root, store }
  }

  async function mountSecondary(rendererProps: Record<string, unknown> = {}) {
    const canvas = createCanvas()
    const root = createRoot(canvas)
    roots.push(root)
    const store = await act(async () =>
      (
        await root.configure({
          primaryCanvas: mainId,
          renderer: rendererProps,
          size: { width: 320, height: 240, top: 0, left: 0 },
          dpr: 1,
          frameloop: 'never',
          scheduler: { after: mainId },
        })
      ).render(<mesh />),
    )
    return { canvas, root, store }
  }

  it("keeps the primary's shadow map on when a shadowless secondary mounts", async () => {
    const primary = await mountPrimary()
    expect(primary.renderer.shadowMap.enabled).toBe(true)

    await mountSecondary()

    // Before the fix, the secondary's default `shadows: false` turned the primary's
    // shadows off on the shared instance.
    expect(primary.renderer.shadowMap.enabled).toBe(true)
  })

  it("keeps the owner's tone mapping; neither defaults nor the secondary's renderer props reach the shared instance", async () => {
    const primary = await mountPrimary()
    // A user-set value, as applyProps would leave it after `<Canvas renderer={{ toneMapping }}>`.
    primary.renderer.toneMapping = THREE.NoToneMapping
    primary.renderer.outputColorSpace = THREE.LinearSRGBColorSpace

    await mountSecondary({ toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace })

    // Before the fix, the secondary's first configure reset both to the sRGB/ACES
    // defaults, and then applied its renderer props on top.
    expect(primary.renderer.toneMapping).toBe(THREE.NoToneMapping)
    expect(primary.renderer.outputColorSpace).toBe(THREE.LinearSRGBColorSpace)
  })

  it('wires XR session listeners once, on the renderer owner', async () => {
    const primary = await mountPrimary()
    // sessionstart + sessionend
    expect(primary.renderer.xr.addEventListener).toHaveBeenCalledTimes(2)
    expect(primary.renderer.xr.addEventListener).toHaveBeenCalledWith('sessionstart', expect.any(Function))
    expect(primary.renderer.xr.addEventListener).toHaveBeenCalledWith('sessionend', expect.any(Function))

    const secondary = await mountSecondary()

    // The secondary gets its own xr state (hooks read it), but adds no listeners.
    expect(secondary.store.getState().xr).toBeTruthy()
    expect(primary.renderer.xr.addEventListener).toHaveBeenCalledTimes(2)

    await act(async () => secondary.root.unmount())
    // Owner-only teardown: the secondary neither added nor removed listeners.
    expect(primary.renderer.xr.removeEventListener).not.toHaveBeenCalled()
    expect(primary.renderer.xr.addEventListener).toHaveBeenCalledTimes(2)
  })
})
