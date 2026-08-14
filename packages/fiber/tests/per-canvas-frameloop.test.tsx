/**
 * @fileoverview Per-canvas frameloop tests (#3852)
 *
 * The scheduler's frameloop is process-global by design — a single RAF loop serves
 * every root. `<Canvas frameloop>` however is a per-canvas prop, and writing it
 * straight to the scheduler made one canvas on 'demand' silently stop the shared
 * loop for every other canvas (#3852).
 *
 * These tests cover the r3f-layer reconciliation:
 *   1. The GLOBAL mode is derived from all roots ('always' > 'demand' > 'never'),
 *      not last-writer-wins.
 *   2. A root on 'demand' is gated per frame: its jobs (default render + useFrame)
 *      only run on frames it was invalidated for, while other roots keep ticking.
 *   3. invalidate(state) targets one root; invalidate() and advance() reach all.
 *
 * Frames are driven deterministically via `getScheduler().step(timestamp)` using
 * 'never'/'demand' combinations (the loop never self-runs), per the pattern in
 * scheduler-integration.test.tsx. 'always' appears only in derived-mode assertions.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { vi } from 'vitest'
import { getScheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { createRoot, useFrame, invalidate, advance, extend } from '../src'

extend(THREE as any)

//* Mock Renderer ==============================
// Minimal WebGPU-style mock (pattern from scheduler-integration.test.tsx).
// `render` is the observable signal for "R3F performed its default render".
class MockWebGPURenderer {
  canvas: HTMLCanvasElement
  private _initialized = false
  shadowMap = { enabled: false, type: THREE.PCFSoftShadowMap }
  outputColorSpace = THREE.SRGBColorSpace
  toneMapping = THREE.ACESFilmicToneMapping
  xr = {
    enabled: false,
    isPresenting: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    setAnimationLoop: () => {},
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
}

describe('per-canvas frameloop (#3852)', () => {
  let canvasA: HTMLCanvasElement
  let canvasB: HTMLCanvasElement
  let rootA: ReturnType<typeof createRoot>
  let rootB: ReturnType<typeof createRoot>

  beforeEach(() => {
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
  })

  //* 1. Derived global mode ==============================

  describe('derived global mode', () => {
    it("keeps the shared loop mode 'always' when a second canvas asks for 'demand' (the #3852 regression)", async () => {
      const scheduler = getScheduler()

      const storeA = await act(async () =>
        (await rootA.configure({ renderer: new MockWebGPURenderer({ canvas: canvasA }), frameloop: 'always' })).render(
          <mesh />,
        ),
      )
      expect(scheduler.frameloop).toBe('always')
      expect(scheduler.isRunning).toBe(true)

      // Pre-fix, this configure was last-writer-wins: it flipped the GLOBAL mode to
      // 'demand' and stopped the one RAF loop, freezing canvas A silently.
      await act(async () =>
        (await rootB.configure({ renderer: new MockWebGPURenderer({ canvas: canvasB }), frameloop: 'demand' })).render(
          <mesh />,
        ),
      )
      expect(scheduler.frameloop).toBe('always')
      expect(scheduler.isRunning).toBe(true)

      // Wind the loop down so no RAF leaks into other tests
      await act(async () => storeA.getState().setFrameloop('never'))
    })

    it('re-derives on imperative setFrameloop and on unmount, in either configure order', async () => {
      const scheduler = getScheduler()

      // Reverse order from the test above: the demand canvas configures FIRST
      const storeB = await act(async () =>
        (await rootB.configure({ renderer: new MockWebGPURenderer({ canvas: canvasB }), frameloop: 'demand' })).render(
          <mesh />,
        ),
      )
      expect(scheduler.frameloop).toBe('demand')

      const storeA = await act(async () =>
        (await rootA.configure({ renderer: new MockWebGPURenderer({ canvas: canvasA }), frameloop: 'always' })).render(
          <mesh />,
        ),
      )
      expect(scheduler.frameloop).toBe('always')

      // The 'always' root stepping down re-derives from what remains
      await act(async () => storeA.getState().setFrameloop('demand'))
      expect(scheduler.frameloop).toBe('demand')

      // ...and stepping one root up wins again
      await act(async () => storeB.getState().setFrameloop('always'))
      expect(scheduler.frameloop).toBe('always')

      // Unmounting the 'always' root releases its intent immediately (not after the
      // 500ms deferred teardown) — the survivor's mode takes over
      await act(async () => rootB.unmount())
      expect(scheduler.frameloop).toBe('demand')
    })
  })

  //* 2. Per-root frame gating ==============================

  describe('per-root gating', () => {
    it("only ticks a 'demand' canvas on frames it was invalidated for, while another canvas keeps ticking", async () => {
      const rendererA = new MockWebGPURenderer({ canvas: canvasA })
      const rendererB = new MockWebGPURenderer({ canvas: canvasB })
      const renderSpyA = vi.spyOn(rendererA, 'render')
      const renderSpyB = vi.spyOn(rendererB, 'render')
      const framesA: number[] = []
      const framesB: number[] = []

      const TickerA = () => {
        useFrame(() => framesA.push(1))
        return null
      }
      const TickerB = () => {
        useFrame(() => framesB.push(1))
        return null
      }

      // 'never' + 'demand' keeps the loop stopped, so scheduler.step() is the only driver
      const storeA = await act(async () =>
        (await rootA.configure({ renderer: rendererA, frameloop: 'never' })).render(<TickerA />),
      )
      const storeB = await act(async () =>
        (await rootB.configure({ renderer: rendererB, frameloop: 'demand' })).render(<TickerB />),
      )

      const scheduler = getScheduler()

      // Mounting content invalidates its root (via invalidateInstance), so B rightly
      // holds one pending frame for its initial commit — drain it before asserting idling.
      // stop() cancels the RAF that invalidate() started, keeping step() the only driver.
      scheduler.stop()
      await act(async () => scheduler.step(984))
      renderSpyA.mockClear()
      renderSpyB.mockClear()
      framesA.length = 0
      framesB.length = 0

      // No pending invalidation: A ('never' = happy to be driven manually) ticks,
      // B ('demand') sits the frames out — render job AND useFrame callback
      await act(async () => {
        scheduler.step(1000)
        scheduler.step(1016)
      })
      expect(renderSpyA).toHaveBeenCalledTimes(2)
      expect(framesA).toHaveLength(2)
      expect(renderSpyB).not.toHaveBeenCalled()
      expect(framesB).toHaveLength(0)

      // B invalidates itself: exactly one granted frame, then idle again
      await act(async () => {
        storeB.getState().invalidate()
        scheduler.stop() // cancel the RAF invalidate() scheduled — step() drives
        scheduler.step(1032)
        scheduler.step(1048)
      })
      expect(renderSpyB).toHaveBeenCalledTimes(1)
      expect(framesB).toHaveLength(1)
      // A was unaffected throughout
      expect(renderSpyA).toHaveBeenCalledTimes(4)

      // Targeted invalidation does not wake the OTHER demand root either
      await act(async () => storeA.getState().setFrameloop('demand'))
      renderSpyA.mockClear()
      renderSpyB.mockClear()
      await act(async () => {
        storeB.getState().invalidate()
        scheduler.stop()
        scheduler.step(1064)
      })
      expect(renderSpyA).not.toHaveBeenCalled()
      expect(renderSpyB).toHaveBeenCalledTimes(1)
    })

    it('invalidate() and advance() without a target reach every root', async () => {
      const rendererA = new MockWebGPURenderer({ canvas: canvasA })
      const rendererB = new MockWebGPURenderer({ canvas: canvasB })
      const renderSpyA = vi.spyOn(rendererA, 'render')
      const renderSpyB = vi.spyOn(rendererB, 'render')

      await act(async () => (await rootA.configure({ renderer: rendererA, frameloop: 'demand' })).render(<mesh />))
      await act(async () => (await rootB.configure({ renderer: rendererB, frameloop: 'demand' })).render(<mesh />))

      const scheduler = getScheduler()
      scheduler.stop() // cancel any RAF from mount-time invalidations — step() drives
      renderSpyA.mockClear()
      renderSpyB.mockClear()

      // Untargeted invalidate grants a frame to every root
      await act(async () => {
        invalidate()
        scheduler.stop()
        scheduler.step(1000)
      })
      expect(renderSpyA).toHaveBeenCalledTimes(1)
      expect(renderSpyB).toHaveBeenCalledTimes(1)

      // advance() manually renders everything, even gated demand roots
      await act(async () => advance(2000))
      expect(renderSpyA).toHaveBeenCalledTimes(2)
      expect(renderSpyB).toHaveBeenCalledTimes(2)

      // ...and the granted frame is consumed: the next bare step idles both again
      await act(async () => scheduler.step(3000))
      expect(renderSpyA).toHaveBeenCalledTimes(2)
      expect(renderSpyB).toHaveBeenCalledTimes(2)
    })
  })
})
