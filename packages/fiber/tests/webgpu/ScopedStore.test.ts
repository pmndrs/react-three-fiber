/**
 * @fileoverview Pure-JS unit tests for the ScopedStore Proxy.
 *
 * `createScopedStore` wraps a flat/nested record in a Proxy that (a) returns the
 * raw value for direct property access, (b) exposes `scope()` / `has()` /
 * `keys()` methods, and (c) forwards `in`, `Object.keys`, spread and `for…in`
 * to the underlying data. This is all pure JS — no GPU — so every trap is
 * exercised directly here.
 */
import { Fn, float, uniform } from 'three/tsl'
import {
  BufferAttribute,
  Data3DTexture,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  StorageTexture,
} from 'three/webgpu'
import { describe, expect, it } from 'vitest'
import { createScopedStore } from '../../src/webgpu/hooks/ScopedStore'
import { isBufferLike, isStorageLike, isTSLNode, isUniformNode } from '../../src/webgpu/hooks/resourceGuards'
import type { TSLNodeLike } from '../../src/webgpu/hooks/useNodes'
import type { StorageLike } from '../../types/store'

const isNumber = (value: unknown): value is number => typeof value === 'number'

describe('resource leaf guards', () => {
  it('recognizes actual UniformNode objects', () => {
    expect(isUniformNode(uniform(1))).toBe(true)
    expect(isUniformNode({ speed: uniform(1) })).toBe(false)
  })

  it('recognizes actual object and callable TSL nodes', () => {
    const operation = Fn(([value]: [ReturnType<typeof float>]) => value.mul(2))

    expect(isTSLNode(float(1))).toBe(true)
    expect(isTSLNode(operation)).toBe(true)
    expect(isTSLNode({ operation })).toBe(false)
  })

  it('recognizes legacy structural TSL nodes without widening to arbitrary objects', () => {
    expect(isTSLNode({ uuid: 'legacy-node', nodeType: 'float' })).toBe(true)
    expect(isTSLNode({ uuid: 'legacy-node' })).toBe(true)
    expect(isTSLNode({ uuid: undefined })).toBe(true)
    expect(isTSLNode({ nodeType: null })).toBe(true)
    expect(isTSLNode({ nodeType: undefined })).toBe(true)

    expect(isTSLNode({})).toBe(false)
    expect(isTSLNode({ uuid: 42 })).toBe(false)
    expect(isTSLNode({ nodeType: {} })).toBe(false)
    expect(isTSLNode({ uuid: 42, nodeType: 'float' })).toBe(false)
    expect(isTSLNode({ uuid: 'legacy-node', nodeType: {} })).toBe(false)
  })

  it('recognizes typed arrays, buffer attributes, and TSL nodes as buffers', () => {
    const interleavedBuffer = new InterleavedBuffer(new Float32Array(6), 3)

    expect(isBufferLike(new Float32Array(3))).toBe(true)
    expect(isBufferLike(new BufferAttribute(new Float32Array(3), 3))).toBe(true)
    expect(isBufferLike(new InterleavedBufferAttribute(interleavedBuffer, 3, 0))).toBe(true)
    expect(isBufferLike(float(1))).toBe(true)
  })

  it('excludes DataView because BufferLike only includes typed arrays', () => {
    expect(isBufferLike(new DataView(new ArrayBuffer(8)))).toBe(false)
  })

  it('recognizes storage textures, data textures, and TSL nodes as GPU storage', () => {
    expect(isStorageLike(new StorageTexture(1, 1))).toBe(true)
    expect(isStorageLike(new Data3DTexture(new Uint8Array(1), 1, 1, 1))).toBe(true)
    expect(isStorageLike(float(1))).toBe(true)
    expect(isStorageLike({ texture: new StorageTexture(1, 1) })).toBe(false)
  })
})

describe('createScopedStore (Proxy semantics)', () => {
  describe('get trap', () => {
    it('returns the raw leaf value for direct property access', () => {
      const store = createScopedStore<number>({ uTime: 1, uScale: 2 }, isNumber)
      expect(store.uTime).toBe(1)
      expect(store.uScale).toBe(2)
    })

    it('returns undefined for a missing key', () => {
      const store = createScopedStore<number>({ uTime: 1 }, isNumber)
      expect((store as any).nope).toBeUndefined()
    })

    it('returns the raw nested object for a scope key (get assumes leaf)', () => {
      const player = { uHealth: 100 }
      const store = createScopedStore<number>({ player }, isNumber)
      // Direct access returns the raw nested record, not a wrapper.
      expect((store as any).player).toBe(player)
    })

    it('preserves access to the scope / has / keys methods', () => {
      const store = createScopedStore<number>({ uTime: 1 }, isNumber)
      expect(typeof store.scope).toBe('function')
      expect(typeof store.has).toBe('function')
      expect(typeof store.keys).toBe('function')
    })
  })

  describe('has() method', () => {
    it('reports whether a key exists', () => {
      const store = createScopedStore<number>({ uTime: 1 }, isNumber)
      expect(store.has('uTime')).toBe(true)
      expect(store.has('missing')).toBe(false)
    })
  })

  describe('keys() method', () => {
    it('returns all top-level keys', () => {
      const store = createScopedStore<number>({ a: 1, b: 2, c: 3 }, isNumber)
      expect(store.keys().sort()).toEqual(['a', 'b', 'c'])
    })

    it('returns an empty array for empty data', () => {
      const store = createScopedStore<number>({}, isNumber)
      expect(store.keys()).toEqual([])
    })
  })

  describe('scope() method', () => {
    it('wraps a nested scope, exposing its leaves via direct access', () => {
      const store = createScopedStore<number>({ player: { uHealth: 100, uMana: 50 } }, isNumber)
      const player = store.scope('player')
      expect(player.uHealth).toBe(100)
      expect(player.uMana).toBe(50)
      expect(player.keys().sort()).toEqual(['uHealth', 'uMana'])
      expect(player.has('uHealth')).toBe(true)
    })

    it('returns an empty wrapper when the scope key is missing', () => {
      const store = createScopedStore<number>({ player: { uHealth: 100 } }, isNumber)
      const missing = store.scope('enemy')
      expect(missing.keys()).toEqual([])
      expect(missing.has('anything')).toBe(false)
      expect((missing as any).anything).toBeUndefined()
    })

    it('returns an empty wrapper when the key is a leaf (non-object) value', () => {
      const store = createScopedStore<number>({ uTime: 1 }, isNumber)
      const notAScope = store.scope('uTime')
      expect(notAScope.keys()).toEqual([])
      expect(notAScope.has('uTime')).toBe(false)
    })

    it('does not treat a UniformNode leaf as a scope', () => {
      const speed = uniform(1)
      const store = createScopedStore({ speed }, isUniformNode)

      expect(store.speed).toBe(speed)
      expect(store.scope('speed').keys()).toEqual([])
    })

    it('does not treat an object TSL node leaf as a scope', () => {
      const speed = float(1)
      const store = createScopedStore({ speed }, isTSLNode)

      expect(store.speed).toBe(speed)
      expect(store.scope('speed').keys()).toEqual([])
    })

    it('does not treat a callable Fn leaf as a scope', () => {
      const operation = Fn(([value]: [ReturnType<typeof float>]) => value.mul(2))
      const store = createScopedStore({ operation }, isTSLNode)

      expect(store.operation).toBe(operation)
      expect(store.scope('operation').keys()).toEqual([])
    })

    it('does not treat a legacy structural node as a scope', () => {
      const legacyNode = { uuid: 'legacy-node', nodeType: 'float' }
      const store = createScopedStore<TSLNodeLike>({ legacyNode }, isTSLNode)

      expect(store.legacyNode).toBe(legacyNode)
      expect(store.scope('legacyNode').keys()).toEqual([])
    })

    it('does not treat an InterleavedBufferAttribute leaf as a scope', () => {
      const buffer = new InterleavedBuffer(new Float32Array(6), 3)
      const attribute = new InterleavedBufferAttribute(buffer, 3, 0)
      const store = createScopedStore({ attribute }, isBufferLike)

      expect(store.attribute).toBe(attribute)
      expect(store.scope('attribute').keys()).toEqual([])
    })

    it('does not treat a Data3DTexture leaf as a scope', () => {
      const texture = new Data3DTexture(new Uint8Array(1), 1, 1, 1)
      const store = createScopedStore<StorageLike>({ texture }, isStorageLike)

      expect(store.texture).toBe(texture)
      expect(store.scope('texture').keys()).toEqual([])
    })

    it('returns a nested record only through scope()', () => {
      const speed = uniform(1)
      const store = createScopedStore({ fog: { speed } }, isUniformNode)

      expect(store.scope<{ speed: typeof speed }>('fog').speed).toBe(speed)
    })

    it('supports nested scopes', () => {
      const store = createScopedStore<number>({ a: { b: { uDeep: 7 } } }, isNumber)
      expect(store.scope('a').scope('b').uDeep).toBe(7)
    })
  })

  describe('has trap (`in` operator)', () => {
    it('reflects membership in the underlying data', () => {
      const store = createScopedStore<number>({ uTime: 1 }, isNumber)
      expect('uTime' in store).toBe(true)
      expect('missing' in store).toBe(false)
    })
  })

  describe('ownKeys / enumeration', () => {
    it('exposes data keys via Object.keys()', () => {
      const store = createScopedStore<number>({ a: 1, b: 2 }, isNumber)
      expect(Object.keys(store).sort()).toEqual(['a', 'b'])
    })

    it('does not leak the scope/has/keys method names into Object.keys()', () => {
      const store = createScopedStore<number>({ a: 1 }, isNumber)
      const keys = Object.keys(store)
      expect(keys).not.toContain('scope')
      expect(keys).not.toContain('has')
      expect(keys).not.toContain('keys')
    })

    it('supports for…in over data keys', () => {
      const store = createScopedStore<number>({ a: 1, b: 2 }, isNumber)
      const seen: string[] = []
      for (const key in store) seen.push(key)
      expect(seen.sort()).toEqual(['a', 'b'])
    })

    it('supports spread producing a plain object of the underlying values', () => {
      const store = createScopedStore<number>({ a: 1, b: 2 }, isNumber)
      expect({ ...store }).toEqual({ a: 1, b: 2 })
    })

    it('spread of a nested scope carries the scope leaves', () => {
      const store = createScopedStore<number>({ player: { uHealth: 100, uMana: 50 } }, isNumber)
      expect({ ...store.scope('player') }).toEqual({ uHealth: 100, uMana: 50 })
    })
  })
})
