import { useMemo } from 'react'
import { useIsomorphicLayoutEffect } from '../../core/utils'
import {
  ROOT_SCOPE,
  flushStagedScope,
  isScopeValid,
  peekStaged,
  readCommittedScope,
  stageEntries,
  type LeafGuard,
  type ResourceKind,
} from '../../core/utils/resourceRegistry'
import type { RootStore } from '#types'

/**
 * @template C candidate type — what the creator produces (raw uniform inputs, TSL nodes, …)
 * @template V value type — what is stored on the map (UniformNode, TSL node, buffer, …)
 */
export interface ScopedResourceOptions<C, V> {
  /** The store the resource lives on (already primary-resolved by the caller). */
  store: RootStore
  kind: ResourceKind
  /** Scope name, or `undefined` for root-level entries. */
  scope: string | undefined
  /** Distinguishes leaf entries from scope sub-objects on this kind's map. */
  isLeaf: LeafGuard
  /**
   * Produces the candidate entries. Runs inside the memo — only when `store`,
   * `scope`, `_hmrVersion`, or `input` change, NOT on every render. Must be
   * pure apart from resource construction: registration is handled here.
   * Return an empty record in reader mode.
   */
  create: () => Record<string, C>
  /**
   * Turns a candidate into the stored value for entries being registered for
   * the first time this generation (wrap in `uniform()`, apply debug labels…).
   * Defaults to the identity — only valid when `C` and `V` coincide.
   */
  prepare?: (name: string, candidate: C) => V
  /**
   * Reconciles an existing entry with a fresh candidate when the entry is
   * reused (e.g. sync a changed uniform value onto the live node — GPU-only,
   * no store write).
   */
  reconcile?: (existing: V, candidate: C) => void
  /** Extra memo dependency (deep-compared input, uniform name, …). */
  input?: unknown
}

/**
 * The one registration mechanism shared by every TSL resource hook
 * (`useNodes`, `useUniforms`, `useBuffers`, `useGPUStorage`, `useUniform`).
 *
 * Render phase (the memo) is pure computation: candidates are created, reused
 * against the current generation, and freshly created values are STAGED in the
 * resource registry — never written to the store, so already-mounted readers
 * are never notified mid-render. Commit phase (the layout effect) flushes the
 * staged entries in one immutable `setState` per scope; readers observe a
 * single old-complete → new-complete transition.
 *
 * Reuse resolution order, per entry name:
 *  1. staged this render pass (same-generation sharing, StrictMode dedup)
 *  2. committed on the store — only while the scope is VALID; after an HMR or
 *     `rebuild*` invalidation nothing committed is reusable, so a stale entry
 *     can never be resurrected into the new generation.
 *
 * Returns exactly the caller's entries (created + reused), not the whole scope.
 */
export function useScopedResource<C, V = C>(options: ScopedResourceOptions<C, V>): Record<string, V> {
  const { store, kind, scope, isLeaf, create, prepare, reconcile, input } = options
  const scopeKey = scope ?? ROOT_SCOPE

  // Re-run creators when a rebuild/HMR invalidation bumps the version. The
  // subscription is against the SAME store the registry is keyed by.
  const version = store((s) => s._hmrVersion)

  const entries = useMemo(() => {
    const staged = peekStaged(store, kind, scopeKey)
    const reusable = isScopeValid(store, kind, scopeKey)
    const map = store.getState()[kind] as Record<string, unknown>
    const committed = reusable ? readCommittedScope(map, scopeKey, isLeaf) : undefined

    const result: Record<string, V> = {}
    let fresh: Record<string, V> | null = null

    for (const [name, candidate] of Object.entries(create())) {
      const existing = (staged?.[name] ?? committed?.[name]) as V | undefined
      if (existing !== undefined) {
        result[name] = existing
        reconcile?.(existing, candidate)
      } else {
        const value = prepare ? prepare(name, candidate) : (candidate as unknown as V)
        result[name] = value
        ;(fresh ??= {})[name] = value
      }
    }

    // Staging is render-phase but registry-only; React may discard this render
    // (StrictMode, interrupted work) — a staged entry then simply gets
    // committed by the next flush of this scope, which is harmless for
    // create-if-not-exists resources and exactly what the reuse path expects.
    if (fresh) stageEntries(store, kind, scopeKey, fresh)
    return result
    // create/prepare/reconcile are intentionally not dependencies: creator
    // identity changes every render (inline closures) and must not bust the
    // cache — `input` carries the hook-specific trigger instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, kind, scopeKey, version, input])

  // Commit phase: land this scope's staged entries on the store. Runs every
  // commit on purpose — the first contributor to flush commits the whole
  // scope's staging atomically and the rest become no-ops.
  useIsomorphicLayoutEffect(() => {
    flushStagedScope(store, kind, scopeKey, isLeaf)
  })

  return entries
}
