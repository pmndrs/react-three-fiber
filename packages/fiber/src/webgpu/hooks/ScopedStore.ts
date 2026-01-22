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

import type { RootState } from '#types'

//* Symbol for internal data storage ==============================
const INTERNAL_DATA = Symbol('ScopedStore.data')

//* Public Types ==============================

/** Keys reserved for methods (excluded from index signature) */
type MethodKeys = 'scope' | 'has' | 'keys'

/**
 * Type-safe wrapper interface for accessing nested store data.
 * Property access returns `T` (assumes leaf node).
 * Use `.scope(key)` for nested object access.
 *
 * Uses mapped type with key filtering to exclude method names from index signature,
 * allowing methods to have their correct return types.
 */
export type ScopedStoreType<T> = {
  /** Direct property access returns the leaf type T (method keys excluded) */
  readonly [K in string as K extends MethodKeys ? never : K]: T
} & {
  /** Access a nested scope by key. Returns empty wrapper if scope doesn't exist. */
  scope(key: string): ScopedStoreType<T>
  /** Check if a key exists in the store */
  has(key: string): boolean
  /** Get all keys in the store */
  keys(): string[]
}

//* ScopedStore Class ==============================

class ScopedStore<T> {
  private [INTERNAL_DATA]: Record<string, T | Record<string, T>>

  constructor(data: Record<string, T | Record<string, T>>) {
    this[INTERNAL_DATA] = data

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
  scope(key: string): ScopedStoreType<T> {
    const data = this[INTERNAL_DATA][key]
    // If it's an object (scope), wrap it; otherwise return empty wrapper
    return new ScopedStore(
      data && typeof data === 'object' ? (data as Record<string, T>) : {},
    ) as unknown as ScopedStoreType<T>
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
export function createScopedStore<T>(data: Record<string, any>): ScopedStoreType<T> {
  return new ScopedStore(data) as unknown as ScopedStoreType<T>
}

//* Creator State Type ==============================

/**
 * State type passed to creator functions with ScopedStore wrappers.
 * Provides type-safe access to uniforms and nodes without manual casting.
 */
export type CreatorState = Omit<RootState, 'uniforms' | 'nodes'> & {
  /** Type-safe uniform access - property access returns UniformNode */
  uniforms: ScopedStoreType<UniformNode>
  /** Type-safe node access - property access returns TSLNodeType (Node | ShaderCallable | ShaderNodeObject) */
  nodes: ScopedStoreType<TSLNodeType>
}

//* Lazy Creator State Factory ==============================

/**
 * Creates a CreatorState with lazy ScopedStore wrappers.
 *
 * The ScopedStore Proxies are only created when `uniforms` or `nodes` are
 * actually accessed, avoiding expensive Proxy creation when the creator
 * function doesn't need them.
 *
 * @param state - The raw RootState from store.getState()
 * @returns CreatorState with lazy-initialized ScopedStore wrappers
 *
 * @example
 * ```tsx
 * const wrappedState = createLazyCreatorState(store.getState())
 * const result = creatorFn(wrappedState)
 * // Proxy only created if creatorFn accessed uniforms or nodes
 * ```
 */
export function createLazyCreatorState(state: RootState): CreatorState {
  let _uniforms: ScopedStoreType<UniformNode> | null = null
  let _nodes: ScopedStoreType<TSLNodeType> | null = null

  return Object.create(state, {
    uniforms: {
      get() {
        return (_uniforms ??= createScopedStore<UniformNode>(state.uniforms))
      },
    },
    nodes: {
      get() {
        return (_nodes ??= createScopedStore<TSLNodeType>(state.nodes))
      },
    },
  }) as CreatorState
}
