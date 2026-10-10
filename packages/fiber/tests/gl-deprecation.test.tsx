import * as React from 'react'
import { act } from 'react'
import { vi } from 'vitest'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

/**
 * state.gl deprecation and aliasing — Tier 1 (jsdom).
 *
 * `state.gl` is a backwards-compat accessor for `internal.actualRenderer`, like `state.renderer`. On
 * a WebGPU root it emits a one-time deprecation notice via `notifyDepreciated`; on a WebGL root it
 * stays silent (see `src/core/utils/stateAccessors.ts`). The store's set() copies accessors as
 * accessors, so `gl` keeps aliasing the renderer after any update (#4014).
 *
 * Notes on the harness:
 *  - `notifyDepreciated` is suppressed in tests unless `R3F_SHOW_DEPRECATION_WARNINGS==='true'`,
 *    so we opt in explicitly here (setupTests otherwise keeps the console quiet).
 *  - The notice is shown once per module instance, so each test loads fiber fresh.
 */

const noop = () => {}

const isDeprecationWarning = (msg: unknown) =>
  typeof msg === 'string' && /state\.gl is deprecated|Please use state\.renderer/i.test(msg)

async function freshFiber() {
  vi.resetModules()
  return {
    store: await import('../src/core/store'),
    fiber: await import('../src/index'),
    legacy: await import('../src/legacy'),
  }
}

describe('state.gl', () => {
  const original = process.env.R3F_SHOW_DEPRECATION_WARNINGS
  let warn: ReturnType<typeof vi.spyOn>
  const deprecationCalls = () => warn.mock.calls.filter(([msg]: unknown[]) => isDeprecationWarning(msg))

  beforeEach(() => {
    process.env.R3F_SHOW_DEPRECATION_WARNINGS = 'true'
    warn = vi.spyOn(console, 'warn').mockImplementation(noop)
    vi.spyOn(console, 'log').mockImplementation(noop)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (original === undefined) delete process.env.R3F_SHOW_DEPRECATION_WARNINGS
    else process.env.R3F_SHOW_DEPRECATION_WARNINGS = original
  })

  it('warns once when accessing state.gl in non-legacy (WebGPU) mode', async () => {
    const { store } = await freshFiber()
    const state = store.createStore(noop, noop).getState()

    // Simulate an initialized WebGPU renderer without a device: non-legacy + a renderer present
    state.internal.actualRenderer = { isFakeRenderer: true } as any
    expect(state.isLegacy).toBe(false)

    const first = state.gl
    const second = state.gl
    expect(first).toBe(state.internal.actualRenderer)
    expect(second).toBe(first)
    expect(deprecationCalls()).toHaveLength(1)
  })

  it('does not warn when accessing state.gl in legacy (WebGL) mode', async () => {
    const { store } = await freshFiber()
    const rootStore = store.createStore(noop, noop)
    rootStore.getState().set({ isLegacy: true })
    rootStore.getState().internal.actualRenderer = { isFakeRenderer: true } as any

    expect(rootStore.getState().gl).toBe(rootStore.getState().internal.actualRenderer)
    expect(deprecationCalls()).toHaveLength(0)
  })

  it('stays an accessor for the renderer across set() (#4014)', async () => {
    const { store } = await freshFiber()
    const rootStore = store.createStore(noop, noop)
    const renderer = { isFakeRenderer: true } as any

    // zustand's own set() would copy the getter's value (null at this point) into a plain field
    rootStore.getState().set({ frameloop: 'never' })
    rootStore.getState().internal.actualRenderer = renderer
    rootStore.setState({ frameloop: 'demand' })

    const state = rootStore.getState()
    expect(Object.getOwnPropertyDescriptor(state, 'gl')?.get).toBeTypeOf('function')
    expect(Object.getOwnPropertyDescriptor(state, 'renderer')?.get).toBeTypeOf('function')
    expect(state.gl).toBe(renderer)
    expect(state.renderer).toBe(renderer)

    // Writing either goes to internal.actualRenderer
    const next = { isOtherRenderer: true } as any
    rootStore.getState().set({ renderer: next })
    expect(rootStore.getState().internal.actualRenderer).toBe(next)
    expect(rootStore.getState().gl).toBe(next)
  })

  it('a WebGPU root: useThree((s) => s.gl) is the renderer, with one notice', async () => {
    const { fiber } = await freshFiber()
    const seen: unknown[] = []
    function ReadsGl() {
      seen.push(fiber.useThree((s) => s.gl))
      return null
    }

    const root = fiber.createRoot(createCanvas({ mode: 'webgpu' }))
    try {
      const store = await act(async () => (await root.configure({ frameloop: 'never' })).render(<ReadsGl />))
      const renderer = store.getState().renderer
      expect(seen.length).toBeGreaterThan(0)
      expect(seen.at(-1)).toBe(renderer)
      expect(deprecationCalls()).toHaveLength(1)
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('a WebGPU root: useFrame callbacks and portals that never read gl log nothing', async () => {
    const { fiber } = await freshFiber()
    let controls: any
    let frameState: any
    function Frame() {
      controls = fiber.useFrame((state) => void (frameState = state))
      return null
    }
    function PortalProbe() {
      fiber.useThree((s) => s.camera)
      return null
    }
    const container = new (await import('three')).Group()

    const root = fiber.createRoot(createCanvas({ mode: 'webgpu' }))
    try {
      await act(async () =>
        (await root.configure({ frameloop: 'never' })).render(
          <>
            <Frame />
            <primitive object={container} />
            {fiber.createPortal(<PortalProbe />, container)}
          </>,
        ),
      )
      await act(async () => controls.step())

      expect(frameState).toBeDefined()
      expect(deprecationCalls()).toHaveLength(0)
      // The frame state still carries the accessor, for callbacks that do read it
      expect(Object.getOwnPropertyDescriptor(frameState, 'gl')?.get).toBeTypeOf('function')
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('a WebGL (/legacy) root: gl is the WebGLRenderer and logs nothing', async () => {
    const { legacy } = await freshFiber()
    const root = legacy.createRoot(createCanvas())
    try {
      const store = await act(async () => (await root.configure({ frameloop: 'never' })).render(null))
      expect(store.getState().gl).toBe(store.getState().renderer)
      expect(deprecationCalls()).toHaveLength(0)
    } finally {
      await act(async () => root.unmount())
    }
  })
})
