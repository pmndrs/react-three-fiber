/**
 * @fileoverview Pure-JS unit tests for the multi-canvas primary registry.
 *
 * `canvasRegistry` coordinates WebGPU multi-canvas rendering: a primary canvas
 * registers its renderer/store under an id, and secondary canvases resolve it
 * (synchronously if already present, or by waiting until it registers). None of
 * this touches a GPU, so it is fully exercisable in jsdom.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  registerPrimary,
  getPrimary,
  waitForPrimary,
  hasPrimary,
  unregisterPrimary,
  getPrimaryIds,
} from '../src/core/canvasRegistry'

// The registry only stores/returns these objects by reference — it never calls
// into them — so plain stand-ins are enough for pure-JS coverage.
const makeRenderer = () => ({}) as any
const makeStore = () => ({ getState: () => ({}), setState: () => {}, subscribe: () => () => {} }) as any

// The registry is module-level singleton state; scrub it between tests so no
// entry or pending subscriber leaks across cases.
function resetRegistry() {
  for (const id of getPrimaryIds()) unregisterPrimary(id)
}

beforeEach(resetRegistry)
afterEach(resetRegistry)

describe('canvasRegistry', () => {
  describe('registerPrimary / getPrimary / hasPrimary', () => {
    it('registers an entry that is then retrievable', () => {
      const renderer = makeRenderer()
      const store = makeStore()

      expect(hasPrimary('main')).toBe(false)
      expect(getPrimary('main')).toBeUndefined()

      registerPrimary('main', renderer, store)

      expect(hasPrimary('main')).toBe(true)
      expect(getPrimary('main')).toEqual({ renderer, store })
      expect(getPrimaryIds()).toContain('main')
    })

    it('warns and overwrites when the same id is registered twice', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const first = makeRenderer()
        const second = makeRenderer()
        registerPrimary('dup', first, makeStore())
        registerPrimary('dup', second, makeStore())

        expect(warn).toHaveBeenCalledTimes(1)
        expect(getPrimary('dup')!.renderer).toBe(second)
      } finally {
        warn.mockRestore()
      }
    })
  })

  describe('waitForPrimary', () => {
    it('resolves immediately when the canvas is already registered', async () => {
      const renderer = makeRenderer()
      const store = makeStore()
      registerPrimary('ready', renderer, store)

      const entry = await waitForPrimary('ready')
      expect(entry).toEqual({ renderer, store })
    })

    it('resolves a pending wait once the canvas registers later', async () => {
      const renderer = makeRenderer()
      const store = makeStore()

      // Start waiting BEFORE anything registers.
      const pending = waitForPrimary('late')

      let resolved = false
      pending.then(() => (resolved = true))
      // Not resolved yet — nothing registered.
      await Promise.resolve()
      expect(resolved).toBe(false)

      registerPrimary('late', renderer, store)

      const entry = await pending
      expect(entry).toEqual({ renderer, store })
    })

    it('notifies every waiter subscribed before registration', async () => {
      const renderer = makeRenderer()
      const store = makeStore()

      const waiterA = waitForPrimary('multi')
      const waiterB = waitForPrimary('multi')

      registerPrimary('multi', renderer, store)

      const [a, b] = await Promise.all([waiterA, waiterB])
      expect(a).toEqual({ renderer, store })
      expect(b).toEqual({ renderer, store })
    })

    it('rejects with a helpful error after the timeout elapses', async () => {
      await expect(waitForPrimary('never', 10)).rejects.toThrow(/Timeout waiting for canvas with id="never"/)
    })

    it('cleans up its pending subscriber on timeout so a later wait can still resolve', async () => {
      // First wait times out and must remove itself from the pending list.
      await expect(waitForPrimary('recover', 10)).rejects.toThrow()

      // A fresh wait + register should still work (no stale/dead subscriber interference).
      const renderer = makeRenderer()
      const store = makeStore()
      const pending = waitForPrimary('recover', 1000)
      registerPrimary('recover', renderer, store)
      expect(await pending).toEqual({ renderer, store })
    })
  })

  describe('unregisterPrimary', () => {
    it('removes the entry', () => {
      registerPrimary('gone', makeRenderer(), makeStore())
      expect(hasPrimary('gone')).toBe(true)

      unregisterPrimary('gone')

      expect(hasPrimary('gone')).toBe(false)
      expect(getPrimary('gone')).toBeUndefined()
      expect(getPrimaryIds()).not.toContain('gone')
    })

    it('is a no-op for an unknown id', () => {
      expect(() => unregisterPrimary('missing')).not.toThrow()
      expect(hasPrimary('missing')).toBe(false)
    })
  })

  describe('register cleanup function (race safety)', () => {
    it('removes the entry when the current entry still matches', () => {
      const renderer = makeRenderer()
      const cleanup = registerPrimary('cleanup', renderer, makeStore())

      expect(hasPrimary('cleanup')).toBe(true)
      cleanup()
      expect(hasPrimary('cleanup')).toBe(false)
    })

    it('does NOT remove a newer entry when a stale cleanup runs', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const oldRenderer = makeRenderer()
        const newRenderer = makeRenderer()

        const cleanupOld = registerPrimary('race', oldRenderer, makeStore())
        // A remount registers a newer entry under the same id before the old cleanup runs.
        registerPrimary('race', newRenderer, makeStore())

        // Stale cleanup from the old registration must not clobber the newer entry.
        cleanupOld()

        expect(hasPrimary('race')).toBe(true)
        expect(getPrimary('race')!.renderer).toBe(newRenderer)
      } finally {
        warn.mockRestore()
      }
    })
  })

  describe('no stale state across register/unregister cycles', () => {
    it('does not resolve a new wait from a prior registration', async () => {
      // Register then fully unregister.
      registerPrimary('cycle', makeRenderer(), makeStore())
      unregisterPrimary('cycle')
      expect(hasPrimary('cycle')).toBe(false)

      // A new wait must NOT resolve from the old (now removed) entry.
      const pending = waitForPrimary('cycle', 1000)
      let resolved = false
      pending.then(() => (resolved = true))
      await Promise.resolve()
      expect(resolved).toBe(false)

      // Only a fresh registration resolves it.
      const renderer = makeRenderer()
      const store = makeStore()
      registerPrimary('cycle', renderer, store)
      expect(await pending).toEqual({ renderer, store })
    })
  })
})
