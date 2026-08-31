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
 * useLocalNodes(({ uniforms }) => ({
 *   wobble: sin(uniforms.uTime.mul(2)),           // No cast needed!
 *   playerHealth: uniforms.scope('player').uHealth // Explicit scope access
 * }))
 * ```
 */

import { withStagedOverlay } from '../../core/utils/resourceRegistry'
import type { RootState, RootStore, BufferLike, StorageLike } from '#types'
import { isBufferLike, isStorageLike, isTSLNode, isUniformNode, type ResourceLeafGuard } from './resourceGuards'

//* Symbol for internal data storage ==============================
const INTERNAL_DATA = Symbol('ScopedStore.data')
const INTERNAL_IS_LEAF = Symbol('ScopedStore.isLeaf')

//* Public Types ==============================

/**
 * Type-safe wrapper interface for accessing nested store data.
 * Property access returns `T` (assumes leaf node).
 * Use `.scope(key)` for nested object access.
 *
 */
type ScopedStoreMethods<TLeaf> = {
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
  private [INTERNAL_DATA]: ScopedStoreData<TLeaf>
  private [INTERNAL_IS_LEAF]: ResourceLeafGuard<TLeaf>

  constructor(data: ScopedStoreData<TLeaf>, isLeaf: ResourceLeafGuard<TLeaf>) {
    this[INTERNAL_DATA] = data
    this[INTERNAL_IS_LEAF] = isLeaf

    return new Proxy(this, {
      get(target, prop, receiver) {
        // Handle string properties
        if (typeof prop === 'string') {
          // Preserve method access
          if (prop === 'scope' || prop === 'has' || prop === 'keys') {
            return Reflect.get(target, prop, receiver)
          }
          // Direct property access returns the value from data
          return target[INTERNAL_DATA][prop]
        }
        // Handle symbols and other property types
        return Reflect.get(target, prop, receiver)
      },

      has(target, prop) {
        // Support 'key' in uniforms
        return typeof prop === 'string' ? prop in target[INTERNAL_DATA] : Reflect.has(target, prop)
      },

      ownKeys(target) {
        // Support Object.keys(), for...in
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
    const scope = value && typeof value === 'object' && !isLeaf(value) ? value : {}

    return new ScopedStore(scope as ScopedStoreData<TLeaf>, isLeaf) as unknown as ScopedStoreType<TLeaf, TScope>
  }

  /**
   * Check if a key exists in the store.
   */
  has(key: string): boolean {
    return key in this[INTERNAL_DATA]
  }

  /**
   * Get all keys in the store.
   */
  keys(): string[] {
    return Object.keys(this[INTERNAL_DATA])
  }
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
  /** Type-safe uniform access - property access returns UniformNode */
  uniforms: ScopedStoreType<UniformNode>
  /** Type-safe node access for real, callable, and legacy structural nodes */
  nodes: ScopedStoreType<TSLNodeType | LegacyTSLNodeLike>
  /** Type-safe buffer access - property access returns BufferLike (TypedArrays, BufferAttributes, TSL nodes) */
  buffers: ScopedStoreType<BufferLike>
  /** Type-safe GPU storage access - property access returns StorageLike (StorageTexture, TSL nodes) */
  gpuStorage: ScopedStoreType<StorageLike>
}

//* Lazy Creator State Factory ==============================

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
 * @param state - The raw RootState from store.getState()
 * @param store - The (primary-resolved) store, for the staged-entry overlay
 * @returns CreatorState with lazy-initialized ScopedStore wrappers
 *
 * @example
 * ```tsx
 * const wrappedState = createLazyCreatorState(store.getState(), store)
 * const result = creatorFn(wrappedState)
 * // Proxy only created if creatorFn accessed uniforms or nodes
 * ```
 */
export function createLazyCreatorState(state: RootState, store?: RootStore): CreatorState {
  let _uniforms: ScopedStoreType<UniformNode> | null = null
  let _nodes: ScopedStoreType<TSLNodeType | LegacyTSLNodeLike> | null = null
  let _buffers: ScopedStoreType<BufferLike> | null = null
  let _gpuStorage: ScopedStoreType<StorageLike> | null = null

  const view = (kind: 'uniforms' | 'nodes' | 'buffers' | 'gpuStorage') =>
    store ? withStagedOverlay(store, kind, state[kind]) : state[kind]

  return Object.create(state, {
    uniforms: {
      get() {
        return (_uniforms ??= createScopedStore<UniformNode>(view('uniforms'), isUniformNode))
      },
    },
    nodes: {
      get() {
        return (_nodes ??= createScopedStore<TSLNodeType | LegacyTSLNodeLike>(view('nodes'), isTSLNode))
      },
    },
    buffers: {
      get() {
        return (_buffers ??= createScopedStore<BufferLike>(view('buffers'), isBufferLike))
      },
    },
    gpuStorage: {
      get() {
        return (_gpuStorage ??= createScopedStore<StorageLike>(view('gpuStorage'), isStorageLike))
      },
    },
  }) as CreatorState
}
