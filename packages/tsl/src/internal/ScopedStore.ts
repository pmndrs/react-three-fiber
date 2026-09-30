/**
 * ScopedStore - Type-safe wrapper for nested stores (uniforms, nodes)
 *
 * Provides TypeScript-friendly access to uniform/node stores where the runtime
 * structure is `Record<string, T | Record<string, T>>` (leaf nodes or nested scopes).
 *
 * The wrapper uses a Proxy to:
 * 1. Return `T` for property access (type assumption: assumes leaf node)
 * 2. Provide `.scope(key)` method for explicit nested access
 * 3. Support iteration methods: has(), keys(), Object.keys(), for...in
 *
 * @example
 * ```tsx
 * // With uniforms registered (see `Register` and the Typed Uniforms guide), reads are typed by name
 * useLocalNodes(({ uniforms }) => ({
 *   wobble: sin(uniforms.uTime.mul(2)),
 *   playerHealth: uniforms.scope('player').uHealth, // or uniforms.player.uHealth
 * }), [])
 *
 * // Without registration, give a scope its schema
 * useLocalNodes(({ uniforms }) => {
 *   const player = uniforms.scope<{ uHealth: UniformNode<'float', number> }>('player')
 *   return { damage: player.uHealth.mul(2) }
 * }, [])
 * ```
 */

import { withStagedOverlay } from './resourceRegistry'
import { getTextureView, type RootState, type RootStore } from '@react-three/fiber/extension'
import type { BufferLike, NodeLike, StorageLike } from '../../types'
import { isBufferLike, isStorageLike, isTSLNode, isUniformNode, type ResourceLeafGuard } from './resourceGuards'
import { SCOPE, type ReadObserver, type ResourceView, type TrackedKind } from './readTracking'
import type { CreatorUniforms } from '../register'

//* Symbol for internal data storage ==============================
const INTERNAL_DATA = Symbol('ScopedStore.data')
const INTERNAL_IS_LEAF = Symbol('ScopedStore.isLeaf')
const INTERNAL_READS = Symbol('ScopedStore.reads')
const INTERNAL_CHILDREN = Symbol('ScopedStore.children')

/**
 * How a wrapper reports the reads it serves (see ./readTracking). `nested` wraps a scope reached by
 * dot access (`uniforms.player`) so reads inside it are reported too; without it only this level's
 * reads are.
 */
export interface ReadOptions {
  observe: ReadObserver
  nested: boolean
}

interface ReadContext extends ReadOptions {
  kind: Exclude<TrackedKind, 'textures'>
  path: readonly string[]
}

//* Public Types ==============================

/**
 * Type-safe wrapper interface for accessing nested store data.
 * Property access returns `T` (assumes leaf node).
 * Use `.scope(key)` for nested object access.
 *
 */
export type ScopedStoreMethods<TLeaf> = {
  /** Access a nested scope by key. Returns empty wrapper if scope doesn't exist. */
  scope<TScope extends Record<string, TLeaf> = Record<string, TLeaf>>(key: string): ScopedStoreType<TLeaf, TScope>
  /** Check if a key exists in the store */
  has(key: string): boolean
  /** Get all keys in the store */
  keys(): string[]
}

export type ScopedStoreType<
  TLeaf,
  TEntries extends Record<string, TLeaf> = Record<string, TLeaf>,
> = Readonly<TEntries> & ScopedStoreMethods<TLeaf>

interface ScopedStoreData<TLeaf> {
  [key: string]: TLeaf | ScopedStoreData<TLeaf>
}

//* ScopedStore Class ==============================

class ScopedStore<TLeaf> {
  /** @internal */
  [INTERNAL_DATA]: ScopedStoreData<TLeaf>;
  /** @internal */
  [INTERNAL_IS_LEAF]: ResourceLeafGuard<TLeaf>;
  /** @internal */
  [INTERNAL_READS]: ReadContext | undefined;
  /** @internal */
  [INTERNAL_CHILDREN]: Map<string, ScopedStore<TLeaf>> | undefined

  constructor(data: ScopedStoreData<TLeaf>, isLeaf: ResourceLeafGuard<TLeaf>, reads?: ReadContext) {
    this[INTERNAL_DATA] = data
    this[INTERNAL_IS_LEAF] = isLeaf
    this[INTERNAL_READS] = reads

    return new Proxy(this, {
      get(target, prop, receiver) {
        // Handle string properties
        if (typeof prop === 'string') {
          // Preserve method access
          if (prop === 'scope' || prop === 'has' || prop === 'keys') {
            return Reflect.get(target, prop, receiver)
          }
          // Direct property access returns the value from data
          return readEntry(target, prop)
        }
        // Handle symbols and other property types
        return Reflect.get(target, prop, receiver)
      },

      has(target, prop) {
        // Support 'key' in uniforms
        return typeof prop === 'string' ? target.has(prop) : Reflect.has(target, prop)
      },

      ownKeys(target) {
        // Support Object.keys(), for...in
        observeKeys(target)
        return Reflect.ownKeys(target[INTERNAL_DATA])
      },

      getOwnPropertyDescriptor(target, prop) {
        // Support spread operator and property enumeration
        if (typeof prop === 'string' && prop in target[INTERNAL_DATA]) {
          return {
            configurable: true,
            enumerable: true,
            value: target[INTERNAL_DATA][prop],
          }
        }
        return undefined
      },
    }) as this
  }

  /**
   * Access a nested scope by key.
   * If the key doesn't exist or isn't a scope object, returns an empty ScopedStore.
   */
  scope<TScope extends Record<string, TLeaf> = Record<string, TLeaf>>(key: string): ScopedStoreType<TLeaf, TScope> {
    const value = this[INTERNAL_DATA][key]
    const isLeaf = this[INTERNAL_IS_LEAF]
    const reads = this[INTERNAL_READS]
    const scope = value && typeof value === 'object' && !isLeaf(value) ? value : {}

    // No read of its own: whatever is read inside the scope is reported at its full path, which
    // also covers the scope appearing, disappearing or turning into a leaf.
    const child = reads ? { ...reads, path: [...reads.path, key] } : undefined
    return new ScopedStore(scope as ScopedStoreData<TLeaf>, isLeaf, child) as unknown as ScopedStoreType<TLeaf, TScope>
  }

  /**
   * Check if a key exists in the store.
   */
  has(key: string): boolean {
    const found = key in this[INTERNAL_DATA]
    const reads = this[INTERNAL_READS]
    reads?.observe({ kind: reads.kind, op: 'has', path: [...reads.path, key], seen: found })
    return found
  }

  /**
   * Get all keys in the store.
   */
  keys(): string[] {
    observeKeys(this)
    return Object.keys(this[INTERNAL_DATA])
  }
}

/** Serve one property read, reporting it and wrapping a scope reached by dot access when nested. */
function readEntry<TLeaf>(target: ScopedStore<TLeaf>, key: string): unknown {
  const value = target[INTERNAL_DATA][key]
  const reads = target[INTERNAL_READS]
  if (!reads) return value

  const isLeaf = target[INTERNAL_IS_LEAF]
  const isScope = !!value && typeof value === 'object' && !isLeaf(value)
  const path = [...reads.path, key]
  reads.observe({ kind: reads.kind, op: 'get', path, seen: isScope ? SCOPE : value })
  if (!isScope || !reads.nested) return value

  const children = (target[INTERNAL_CHILDREN] ??= new Map())
  let child = children.get(key)
  if (!child) {
    child = new ScopedStore(value as ScopedStoreData<TLeaf>, isLeaf, { ...reads, path })
    children.set(key, child)
  }
  return child
}

function observeKeys<TLeaf>(target: ScopedStore<TLeaf>): void {
  const reads = target[INTERNAL_READS]
  reads?.observe({ kind: reads.kind, op: 'keys', path: reads.path, seen: Object.keys(target[INTERNAL_DATA]) })
}

//* Factory Function ==============================

/**
 * Create a type-safe ScopedStore wrapper around store data.
 * @param data - The raw store data (uniforms or nodes from RootState)
 * @returns A ScopedStoreType wrapper with type-safe access
 */
export function createScopedStore<TLeaf>(
  data: ScopedStoreData<TLeaf>,
  isLeaf: ResourceLeafGuard<TLeaf>,
): ScopedStoreType<TLeaf> {
  return new ScopedStore(data, isLeaf) as unknown as ScopedStoreType<TLeaf>
}

//* Creator State Type ==============================

/**
 * State type passed to creator functions with ScopedStore wrappers.
 * Provides type-safe access to uniforms, nodes, buffers, and gpuStorage without manual casting.
 */
export type CreatorState = Omit<RootState, 'uniforms' | 'nodes' | 'buffers' | 'gpuStorage'> & {
  /** Type-safe uniform access - property access returns UniformNode, typed by name when registered */
  uniforms: CreatorUniforms
  /** Type-safe node access for real, callable, and legacy structural nodes */
  nodes: ScopedStoreType<NodeLike>
  /** Type-safe buffer access - property access returns BufferLike (TypedArrays, BufferAttributes, TSL nodes) */
  buffers: ScopedStoreType<BufferLike>
  /** Type-safe GPU storage access - property access returns StorageLike (StorageTexture, TSL nodes) */
  gpuStorage: ScopedStoreType<StorageLike>
}

//* Texture Reads ==============================

type TextureMap = RootState['textures']

/**
 * The URL-keyed texture Map, reporting each read. A Proxy over the real Map, so `instanceof Map` and
 * every method keep working; methods run against the Map itself (a Map method throws on any other
 * receiver). Iteration reports the key list and every entry it hands out.
 */
function observeTextures(map: TextureMap, observe: ReadObserver): TextureMap {
  const observeKeys = () => observe({ kind: 'textures', op: 'keys', path: [], seen: [...map.keys()] })
  const observeAll = () => {
    observeKeys()
    for (const [url, texture] of map) observe({ kind: 'textures', op: 'get', path: [url], seen: texture })
  }

  return new Proxy(map, {
    get(target, prop) {
      switch (prop) {
        case 'get':
          return (url: string) => {
            const texture = target.get(url)
            observe({ kind: 'textures', op: 'get', path: [url], seen: texture })
            return texture
          }
        case 'has':
          return (url: string) => {
            const found = target.has(url)
            observe({ kind: 'textures', op: 'has', path: [url], seen: found })
            return found
          }
        case 'size':
          observeKeys()
          return target.size
        case 'keys':
          return () => {
            observeKeys()
            return target.keys()
          }
        case 'values':
          return () => {
            observeAll()
            return target.values()
          }
        case 'entries':
        case Symbol.iterator:
          return () => {
            observeAll()
            return target.entries()
          }
        case 'forEach':
          return (callback: Parameters<TextureMap['forEach']>[0], thisArg?: unknown) => {
            observeAll()
            target.forEach(callback, thisArg)
          }
      }
      const value = Reflect.get(target, prop, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

//* Resource View ==============================

/**
 * The resource maps as a creator on `local` sees them: the TSL maps from the primary store (where
 * they are registered and shared) with this render pass's staged entries overlaid, and `textures`
 * from the component's own canvas (where `useTexture` registers them), including textures a
 * `useTexture` earlier in this render loaded but has not registered yet. Each call reads the stores
 * now, so a view used after commit sees what was flushed in that commit.
 */
export function createResourceView(primary: RootStore, local: RootStore = primary): ResourceView {
  return ((kind: TrackedKind) =>
    kind === 'textures'
      ? getTextureView(local)
      : withStagedOverlay(primary, kind, primary.getState()[kind])) as ResourceView
}

//* Lazy Creator State Factory ==============================

export interface CreatorStateOptions {
  /** Report every resource read (see ./readTracking). */
  reads?: ReadOptions
  /**
   * Where the resource maps and `textures` come from. Without it the TSL maps come from `store`
   * (with its staged overlay) and `textures` from `state`.
   */
  view?: ResourceView
}

/**
 * Creates a CreatorState with lazy ScopedStore wrappers.
 *
 * The ScopedStore Proxies are only created when `uniforms` or `nodes` are
 * actually accessed, avoiding expensive Proxy creation when the creator
 * function doesn't need them.
 *
 * When `store` is provided, the wrappers overlay entries STAGED during the
 * current render pass on top of the committed maps. Registration is deferred
 * to the commit phase, so without the overlay a creator could not see
 * resources a sibling hook created earlier in the same render (e.g. a node
 * deriving from a uniform declared two lines above).
 *
 * The maps are read when a wrapper is first accessed, not taken from `state`: during render they
 * are the same, but an install step (see useLocalNodes) may first touch a wrapper after commit,
 * when entries staged during render have been flushed and are no longer in the overlay.
 *
 * With `options.reads`, every resource read is reported, `textures` included (see ./readTracking);
 * this is how `useLocalNodes` knows what its creator depends on.
 *
 * @param state - The RootState the creator's other fields (`scene`, `camera`, ...) come from
 * @param store - The (primary-resolved) store, for the TSL maps and their staged overlay
 * @param options - Optional read reporting and resource view
 * @returns CreatorState with lazy-initialized ScopedStore wrappers
 *
 * @example
 * ```tsx
 * const wrappedState = createLazyCreatorState(store.getState(), store)
 * const result = creatorFn(wrappedState)
 * // Proxy only created if creatorFn accessed uniforms or nodes
 * ```
 */
export function createLazyCreatorState(
  state: RootState,
  store?: RootStore,
  options: CreatorStateOptions = {},
): CreatorState {
  const { reads } = options
  const view = options.view ?? (store ? createResourceView(store) : undefined)

  let _uniforms: ScopedStoreType<UniformNode> | null = null
  let _nodes: ScopedStoreType<NodeLike> | null = null
  let _buffers: ScopedStoreType<BufferLike> | null = null
  let _gpuStorage: ScopedStoreType<StorageLike> | null = null
  let _textures: TextureMap | null = null

  // The overlay is a plain `Record<string, unknown>`: which entries are leaves and which are
  // nested scopes is decided at access time by the guard each wrapper is given, not by the type.
  const read = <TLeaf>(kind: ReadContext['kind']): ScopedStoreData<TLeaf> =>
    (view ? view(kind) : state[kind]) as ScopedStoreData<TLeaf>

  const wrap = <TLeaf>(kind: ReadContext['kind'], isLeaf: ResourceLeafGuard<TLeaf>) =>
    new ScopedStore(
      read<TLeaf>(kind),
      isLeaf,
      reads && { ...reads, kind, path: [] },
    ) as unknown as ScopedStoreType<TLeaf>

  const properties: PropertyDescriptorMap = {
    uniforms: {
      get() {
        return (_uniforms ??= wrap<UniformNode>('uniforms', isUniformNode))
      },
    },
    nodes: {
      get() {
        return (_nodes ??= wrap<NodeLike>('nodes', isTSLNode))
      },
    },
    buffers: {
      get() {
        return (_buffers ??= wrap<BufferLike>('buffers', isBufferLike))
      },
    },
    gpuStorage: {
      get() {
        return (_gpuStorage ??= wrap<StorageLike>('gpuStorage', isStorageLike))
      },
    },
  }
  if (options.view) {
    properties.textures = {
      get() {
        const textures = options.view!('textures') as TextureMap
        return (_textures ??= reads ? observeTextures(textures, reads.observe) : textures)
      },
    }
  }

  return Object.create(state, properties) as CreatorState
}
