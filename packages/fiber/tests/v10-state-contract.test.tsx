import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'

import { createRoot, useThree, useFrame, extend } from '../src'

extend(THREE as any)

/**
 * v10 removed-API contract (regression guard).
 *
 * v10 removed `state.clock` in favor of RAF-derived `time` / `delta` / `elapsed`
 * (see docs/v10-migration.md). Nothing else in the suite asserts the removal, so
 * a regression could silently re-add `clock`. This locks it in two places: the
 * store state (`useThree`) and the per-frame callback state (`useFrame`).
 *
 * The `time` / `delta` / `elapsed` replacements live on the per-frame callback
 * state (not the base store), so their presence is asserted inside `useFrame`.
 * Their numeric behavior end-to-end is covered by scheduler-integration.test.tsx.
 */
describe('v10 state contract', () => {
  let root: ReturnType<typeof createRoot> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
  })

  it('does not expose the removed state.clock on the store state (useThree)', async () => {
    let state!: Record<string, unknown>

    function Probe() {
      state = useThree() as unknown as Record<string, unknown>
      return null
    }

    await act(async () => {
      root.render(<Probe />)
    })

    expect(state.clock).toBeUndefined()
    expect('clock' in state).toBe(false)
  })

  it('does not expose state.clock on the per-frame callback state (useFrame)', async () => {
    let frameState: Record<string, unknown> | undefined

    function Probe() {
      useFrame((state) => {
        frameState = state as unknown as Record<string, unknown>
      })
      return null
    }

    await act(async () => {
      root.render(<Probe />)
    })
    // Let at least one frame run so the callback captures the frame state.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })

    expect(frameState).toBeDefined()
    expect(frameState!.clock).toBeUndefined()
    expect('clock' in frameState!).toBe(false)
    // The replacements are present on the frame state.
    expect(typeof frameState!.elapsed).toBe('number')
    expect(typeof frameState!.delta).toBe('number')
  })
})
