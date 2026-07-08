/**
 * @fileoverview Pure-JS unit tests for the ScopedStore Proxy.
 *
 * `createScopedStore` wraps a flat/nested record in a Proxy that (a) returns the
 * raw value for direct property access, (b) exposes `scope()` / `has()` /
 * `keys()` methods, and (c) forwards `in`, `Object.keys`, spread and `for…in`
 * to the underlying data. This is all pure JS — no GPU — so every trap is
 * exercised directly here.
 */
import { describe, expect, it } from 'vitest'
import { createScopedStore } from '../../src/webgpu/hooks/ScopedStore'

describe('createScopedStore (Proxy semantics)', () => {
  describe('get trap', () => {
    it('returns the raw leaf value for direct property access', () => {
      const store = createScopedStore<number>({ uTime: 1, uScale: 2 })
      expect(store.uTime).toBe(1)
      expect(store.uScale).toBe(2)
    })

    it('returns undefined for a missing key', () => {
      const store = createScopedStore<number>({ uTime: 1 })
      expect((store as any).nope).toBeUndefined()
    })

    it('returns the raw nested object for a scope key (get assumes leaf)', () => {
      const player = { uHealth: 100 }
      const store = createScopedStore<number>({ player })
      // Direct access returns the raw nested record, not a wrapper.
      expect((store as any).player).toBe(player)
    })

    it('preserves access to the scope / has / keys methods', () => {
      const store = createScopedStore<number>({ uTime: 1 })
      expect(typeof store.scope).toBe('function')
      expect(typeof store.has).toBe('function')
      expect(typeof store.keys).toBe('function')
    })
  })

  describe('has() method', () => {
    it('reports whether a key exists', () => {
      const store = createScopedStore<number>({ uTime: 1 })
      expect(store.has('uTime')).toBe(true)
      expect(store.has('missing')).toBe(false)
    })
  })

  describe('keys() method', () => {
    it('returns all top-level keys', () => {
      const store = createScopedStore<number>({ a: 1, b: 2, c: 3 })
      expect(store.keys().sort()).toEqual(['a', 'b', 'c'])
    })

    it('returns an empty array for empty data', () => {
      const store = createScopedStore<number>({})
      expect(store.keys()).toEqual([])
    })
  })

  describe('scope() method', () => {
    it('wraps a nested scope, exposing its leaves via direct access', () => {
      const store = createScopedStore<number>({ player: { uHealth: 100, uMana: 50 } })
      const player = store.scope('player')
      expect(player.uHealth).toBe(100)
      expect(player.uMana).toBe(50)
      expect(player.keys().sort()).toEqual(['uHealth', 'uMana'])
      expect(player.has('uHealth')).toBe(true)
    })

    it('returns an empty wrapper when the scope key is missing', () => {
      const store = createScopedStore<number>({ player: { uHealth: 100 } })
      const missing = store.scope('enemy')
      expect(missing.keys()).toEqual([])
      expect(missing.has('anything')).toBe(false)
      expect((missing as any).anything).toBeUndefined()
    })

    it('returns an empty wrapper when the key is a leaf (non-object) value', () => {
      const store = createScopedStore<number>({ uTime: 1 })
      const notAScope = store.scope('uTime')
      expect(notAScope.keys()).toEqual([])
      expect(notAScope.has('uTime')).toBe(false)
    })

    it('supports nested scopes', () => {
      const store = createScopedStore<number>({ a: { b: { uDeep: 7 } } })
      expect(store.scope('a').scope('b').uDeep).toBe(7)
    })
  })

  describe('has trap (`in` operator)', () => {
    it('reflects membership in the underlying data', () => {
      const store = createScopedStore<number>({ uTime: 1 })
      expect('uTime' in store).toBe(true)
      expect('missing' in store).toBe(false)
    })
  })

  describe('ownKeys / enumeration', () => {
    it('exposes data keys via Object.keys()', () => {
      const store = createScopedStore<number>({ a: 1, b: 2 })
      expect(Object.keys(store).sort()).toEqual(['a', 'b'])
    })

    it('does not leak the scope/has/keys method names into Object.keys()', () => {
      const store = createScopedStore<number>({ a: 1 })
      const keys = Object.keys(store)
      expect(keys).not.toContain('scope')
      expect(keys).not.toContain('has')
      expect(keys).not.toContain('keys')
    })

    it('supports for…in over data keys', () => {
      const store = createScopedStore<number>({ a: 1, b: 2 })
      const seen: string[] = []
      for (const key in store) seen.push(key)
      expect(seen.sort()).toEqual(['a', 'b'])
    })

    it('supports spread producing a plain object of the underlying values', () => {
      const store = createScopedStore<number>({ a: 1, b: 2 })
      expect({ ...store }).toEqual({ a: 1, b: 2 })
    })

    it('spread of a nested scope carries the scope leaves', () => {
      const store = createScopedStore<number>({ player: { uHealth: 100, uMana: 50 } })
      expect({ ...store.scope('player') }).toEqual({ uHealth: 100, uMana: 50 })
    })
  })
})
