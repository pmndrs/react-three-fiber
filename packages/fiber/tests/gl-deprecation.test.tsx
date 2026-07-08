import { vi } from 'vitest'
import { createStore } from '../src/core/store'

/**
 * state.gl deprecation warning path — Tier 1 (jsdom).
 *
 * `state.gl` is a backwards-compat accessor for `internal.actualRenderer`. In non-legacy
 * (WebGPU) mode it emits a one-time deprecation notice via `notifyDepreciated`; in legacy
 * (WebGL) mode it stays silent (see the getter in `src/core/store.ts`).
 *
 * Notes on the harness:
 *  - `notifyDepreciated` is suppressed in tests unless `R3F_SHOW_DEPRECATION_WARNINGS==='true'`,
 *    so we opt in explicitly here (setupTests otherwise keeps the console quiet).
 *  - We build a store with `createStore` and mutate `isLegacy` / `internal.actualRenderer`
 *    in place. Going through zustand's `set()` would replace the state object and strip the
 *    `gl` accessor (it is defined on the initial state object), so direct mutation is required
 *    to keep the getter installed — and it lets us flip legacy mode without a GPU.
 */

const noop = () => {}

describe('state.gl deprecation warning', () => {
  const original = process.env.R3F_SHOW_DEPRECATION_WARNINGS

  beforeEach(() => {
    process.env.R3F_SHOW_DEPRECATION_WARNINGS = 'true'
  })

  afterEach(() => {
    if (original === undefined) delete process.env.R3F_SHOW_DEPRECATION_WARNINGS
    else process.env.R3F_SHOW_DEPRECATION_WARNINGS = original
  })

  const isDeprecationWarning = (msg: unknown) =>
    typeof msg === 'string' && /state\.gl is deprecated|Please use state\.renderer/i.test(msg)

  it('warns once when accessing state.gl in non-legacy (WebGPU) mode', () => {
    const store = createStore(noop, noop)
    const state = store.getState()

    // Simulate an initialized WebGPU renderer without a device: non-legacy + a renderer present
    state.internal.actualRenderer = { isFakeRenderer: true } as any
    expect(state.isLegacy).toBe(false)

    const warn = vi.spyOn(console, 'warn').mockImplementation(noop)
    try {
      const first = state.gl
      const second = state.gl

      // Accessor still resolves to the underlying renderer
      expect(first).toBe(state.internal.actualRenderer)
      expect(second).toBe(first)

      // Deprecation body is emitted via console.warn, exactly once (dedup by heading)
      const deprecationCalls = warn.mock.calls.filter(([msg]) => isDeprecationWarning(msg))
      expect(deprecationCalls).toHaveLength(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('does not warn when accessing state.gl in legacy (WebGL) mode', () => {
    const store = createStore(noop, noop)
    const state = store.getState()

    // Legacy mode: flip the flag in place so the getter stays installed
    state.isLegacy = true
    state.internal.actualRenderer = { isFakeRenderer: true } as any

    const warn = vi.spyOn(console, 'warn').mockImplementation(noop)
    try {
      const gl = state.gl
      expect(gl).toBe(state.internal.actualRenderer)

      const deprecationCalls = warn.mock.calls.filter(([msg]) => isDeprecationWarning(msg))
      expect(deprecationCalls).toHaveLength(0)
    } finally {
      warn.mockRestore()
    }
  })
})
