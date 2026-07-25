/**
 * @fileoverview Scheduler Integration Tests
 *
 * These tests cover R3F's INTEGRATION with the external `@pmndrs/scheduler`
 * package — not the scheduler internals (those are the upstream package's job).
 * Two flagship v10 behaviors are exercised end-to-end:
 *
 *   1. Render-phase takeover — a `useFrame(cb, { phase: 'render' })` job makes R3F
 *      skip its default render (via `scheduler.hasUserJobsInPhase`), and the default
 *      render resumes once that job unmounts.
 *   2. fps throttling — `useFrame({ fps: N })` throttles callback frequency, with the
 *      two `drop` semantics: `drop: true` (discard the missed remainder) vs
 *      `drop: false` (catch up, staying closer to the target fps).
 *
 * All frames are driven deterministically via `getScheduler().step(timestamp)` with
 * explicit timestamps (frameloop: 'never'), so nothing depends on a real RAF clock or
 * a real GPU. Rendering is observed through an external mock renderer (the proven
 * pattern from external-renderer.test.tsx) so the "default render happened" signal is
 * a plain spy, not a GPU draw.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { vi } from 'vitest'
import { getScheduler, Scheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { createRoot, useFrame, useThree, extend } from '../src'

extend(THREE as any)

//* Mock Renderer ==============================
// Minimal WebGPU-style mock so the default render job has something to call.
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

describe('scheduler integration', () => {
  let canvas: HTMLCanvasElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    canvas = createCanvas()
    root = createRoot(canvas)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
  })

  //* 1. Render-phase takeover ==============================

  describe('render-phase takeover', () => {
    it('runs the default render each manual frame when no render-phase job is registered', async () => {
      const renderer = new MockWebGPURenderer({ canvas })
      const renderSpy = vi.spyOn(renderer, 'render')

      await act(async () => (await root.configure({ renderer, frameloop: 'never' })).render(<mesh />))

      const scheduler = getScheduler()
      renderSpy.mockClear()

      await act(async () => {
        scheduler.step(1000)
        scheduler.step(1016)
        scheduler.step(1032)
      })

      // No user render-phase job -> R3F's default render runs on every frame
      expect(renderSpy).toHaveBeenCalledTimes(3)
    })

    it('skips the default render when a { phase: "render" } job takes over, and resumes on unmount', async () => {
      const renderer = new MockWebGPURenderer({ canvas })
      const renderSpy = vi.spyOn(renderer, 'render')

      const userRenderCalls: number[] = []
      let rootId: string | undefined

      const RenderTakeover = () => {
        rootId = useThree((s) => (s.internal as any).rootId)
        useFrame(() => userRenderCalls.push(1), { phase: 'render' })
        return null
      }

      await act(async () => (await root.configure({ renderer, frameloop: 'never' })).render(<RenderTakeover />))

      const scheduler = getScheduler()

      // The user job registered in the 'render' phase — R3F sees the takeover.
      expect(scheduler.hasUserJobsInPhase('render', rootId)).toBe(true)

      renderSpy.mockClear()
      userRenderCalls.length = 0

      await act(async () => {
        scheduler.step(1000)
        scheduler.step(1050)
      })

      // Default render is skipped; the user's render-phase callback runs instead.
      expect(renderSpy).not.toHaveBeenCalled()
      expect(userRenderCalls.length).toBe(2)

      // Unmount the takeover component -> default render resumes.
      await act(async () => root.render(<mesh />))

      expect(scheduler.hasUserJobsInPhase('render', rootId)).toBe(false)

      renderSpy.mockClear()
      userRenderCalls.length = 0

      await act(async () => {
        scheduler.step(1100)
        scheduler.step(1150)
      })

      // Default render is back; the (now-unmounted) user callback no longer fires.
      expect(renderSpy).toHaveBeenCalledTimes(2)
      expect(userRenderCalls.length).toBe(0)
    })

    it('does not skip the default render for a non-render phase job (e.g. update)', async () => {
      const renderer = new MockWebGPURenderer({ canvas })
      const renderSpy = vi.spyOn(renderer, 'render')

      const updateCalls: number[] = []
      const UpdateJob = () => {
        useFrame(() => updateCalls.push(1), { phase: 'update' })
        return null
      }

      await act(async () => (await root.configure({ renderer, frameloop: 'never' })).render(<UpdateJob />))

      const scheduler = getScheduler()
      renderSpy.mockClear()
      updateCalls.length = 0

      await act(async () => {
        scheduler.step(2000)
        scheduler.step(2016)
      })

      // A job outside the 'render' phase does NOT count as taking over rendering.
      expect(updateCalls.length).toBe(2)
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })
  })

  //* 2. fps throttling end-to-end ==============================

  describe('fps throttling end-to-end', () => {
    it('throttles callback frequency with { fps } (drop: true default)', async () => {
      const throttled: number[] = []
      const unthrottled: number[] = []

      const Comp = () => {
        // fps 20 -> min interval 50ms. drop defaults to true.
        useFrame(() => throttled.push(1), { fps: 20 })
        // no fps -> runs every frame, the control baseline.
        useFrame(() => unthrottled.push(1))
        return null
      }

      const renderer = new MockWebGPURenderer({ canvas })
      await act(async () => (await root.configure({ renderer, frameloop: 'never' })).render(<Comp />))

      const scheduler = getScheduler()

      // Step at 10ms intervals (~100fps) for 100 frames of simulated time.
      const base = 100_000
      const stepMs = 10
      const frames = 100
      await act(async () => {
        for (let i = 0; i < frames; i++) scheduler.step(base + i * stepMs)
      })

      // Unthrottled callback runs on every single frame.
      expect(unthrottled.length).toBe(frames)

      // fps 20 over a 100fps step rate -> roughly 1 in every 5 frames (~20 runs).
      expect(throttled.length).toBeLessThan(frames / 2)
      expect(throttled.length).toBeGreaterThanOrEqual(18)
      expect(throttled.length).toBeLessThanOrEqual(22)
    })

    it('catches up with { drop: false } and discards with { drop: true }', async () => {
      const dropTrue: number[] = []
      const dropFalse: number[] = []

      const Comp = () => {
        // Same target fps, opposite drop behavior, driven by the same timestamps.
        useFrame(() => dropTrue.push(1), { fps: 30, drop: true })
        useFrame(() => dropFalse.push(1), { fps: 30, drop: false })
        return null
      }

      const renderer = new MockWebGPURenderer({ canvas })
      await act(async () => (await root.configure({ renderer, frameloop: 'never' })).render(<Comp />))

      const scheduler = getScheduler()

      // Step at 20ms (50fps) while both jobs target 30fps (~33.33ms interval).
      // The step cadence does not divide the target interval evenly, which is where
      // the two drop modes diverge: drop:true resets lastRun to `now` on every run
      // (the missed remainder is discarded), while drop:false advances lastRun by
      // whole intervals and catches up on the frames it fell behind — so it fires
      // more often. Counts here are deterministic (fixed timestamps + IEEE-754).
      const base = 200_000
      const stepMs = 20
      const frames = 120
      await act(async () => {
        for (let i = 0; i < frames; i++) scheduler.step(base + i * stepMs)
      })

      // Both throttle below the raw frame rate...
      expect(dropTrue.length).toBeLessThan(frames)
      expect(dropFalse.length).toBeLessThan(frames)
      expect(dropTrue.length).toBeGreaterThan(0)

      // ...but drop:false catches up the missed frames, so it runs meaningfully more
      // often than drop:true over the same mismatched cadence. This is the core,
      // observable difference between the two modes at the useFrame level.
      expect(dropFalse.length).toBeGreaterThan(dropTrue.length)

      // Deterministic sanity bands (observed: drop:true = 60, drop:false = 95).
      expect(dropTrue.length).toBeGreaterThanOrEqual(55)
      expect(dropTrue.length).toBeLessThanOrEqual(65)
      expect(dropFalse.length).toBeGreaterThanOrEqual(88)
      expect(dropFalse.length).toBeLessThanOrEqual(100)
    })

    it('a { fps } job still runs every time it is manually stepped (throttle bypassed)', async () => {
      const calls: number[] = []
      let controls: any

      const Comp = () => {
        controls = useFrame(() => calls.push(1), { fps: 1, id: 'throttled-job' })
        return null
      }

      const renderer = new MockWebGPURenderer({ canvas })
      await act(async () => (await root.configure({ renderer, frameloop: 'never' })).render(<Comp />))

      // controls.step() targets this job directly and bypasses fps limiting, even
      // though fps:1 would otherwise gate it to once per second.
      await act(async () => {
        controls.step(500_000)
        controls.step(500_001)
        controls.step(500_002)
      })

      expect(calls.length).toBe(3)
    })
  })

  //* 3. Imperative setFrameloop reaches the scheduler ==============================

  describe('imperative setFrameloop', () => {
    it('mirrors runtime mode changes onto the scheduler, not just store state', async () => {
      const renderer = new MockWebGPURenderer({ canvas })
      const store = await act(async () => (await root.configure({ renderer, frameloop: 'never' })).render(<mesh />))

      const scheduler = getScheduler()
      const { setFrameloop } = store.getState()

      // configure() pushed the prop through, so both sides start at 'never'
      expect(scheduler.frameloop).toBe('never')

      // Runtime change must reach the scheduler. Before the bridge this only moved
      // store state and the scheduler stayed on 'never'.
      await act(async () => setFrameloop('demand'))
      expect(store.getState().frameloop).toBe('demand')
      expect(scheduler.frameloop).toBe('demand')

      // 'always' additionally starts the RAF loop (the scheduler's setter owns that)
      await act(async () => setFrameloop('always'))
      expect(scheduler.frameloop).toBe('always')
      expect(scheduler.isRunning).toBe(true)

      // ...and leaving 'always' stops it again. Also returns the shared scheduler to
      // 'never' so this test doesn't leave a live RAF loop for the next one.
      await act(async () => setFrameloop('never'))
      expect(scheduler.frameloop).toBe('never')
      expect(scheduler.isRunning).toBe(false)
    })

    it('defaults to always when called with no argument', async () => {
      const renderer = new MockWebGPURenderer({ canvas })
      const store = await act(async () => (await root.configure({ renderer, frameloop: 'never' })).render(<mesh />))

      const scheduler = getScheduler()
      const { setFrameloop } = store.getState()

      await act(async () => setFrameloop())
      expect(store.getState().frameloop).toBe('always')
      expect(scheduler.frameloop).toBe('always')

      await act(async () => setFrameloop('never'))
    })
  })
})
