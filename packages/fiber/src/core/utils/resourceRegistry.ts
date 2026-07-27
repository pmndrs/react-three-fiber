import type { RootState, RootStore } from '#types'

/**
 * @fileoverview Registration bookkeeping for the shared TSL resource maps
 * (`nodes`, `uniforms`, `buffers`, `gpuStorage`).
 *
 * The resource hooks create entries during render, but writing to the zustand
 * store during render notifies subscribed readers mid-render (React error
 * "Cannot update a component while rendering") and exposes half-rebuilt state.
 * This registry solves both by splitting registration in two:
 *
 *  1. Render phase: freshly created entries are *staged* here — plain module
 *     state keyed by store, invisible to subscribers, safe to write anytime.
 *  2. Commit phase: `flushStagedScope` moves everything staged for a scope
 *     into the store in ONE immutable `setState`, so readers observe exactly
 *     one transition per scope: old-complete → new-complete.
 *
 * Staleness is tracked per scope via a `valid` set instead of physically
 * wiping the maps. HMR / `rebuild*` invalidate scopes (and bump `_hmrVersion`
 * to re-run creators); until the new generation is flushed, readers keep
 * seeing the previous entries — never an empty scope. A creator only reuses a
 * committed entry when its scope is still valid, so invalidated entries can't
 * be resurrected no matter how creator re-runs interleave.
 */

//* Types & Constants ==============================

/** The four RootState maps managed through this registry. */
export type ResourceKind = 'nodes' | 'uniforms' | 'buffers' | 'gpuStorage'

export const RESOURCE_KINDS: readonly ResourceKind[] = ['nodes', 'uniforms', 'buffers', 'gpuStorage']

/**
 * Scope key for root-level entries (stored flat on the map, next to scope
 * objects). The empty string can never collide with a user scope because the
 * hooks treat a falsy scope argument as "root".
 */
export const ROOT_SCOPE = ''

export type ResourceEntries = Record<string, unknown>

/** Distinguishes leaf entries from scope sub-objects on a resource map. */
export type LeafGuard = (value: unknown) => boolean

interface KindRegistry {
  /**
   * Scopes whose committed entries may be reused by creators. A scope enters
   * on flush and leaves on invalidation — so after an HMR/rebuild invalidation
   * every committed entry is invisible to reuse until a creator re-registers.
   */
  valid: Set<string>
  /** Entries created during render, awaiting the commit-phase flush. */
  staged: Map<string, ResourceEntries>
}

/**
 * Per-store registries, keyed by the store the hooks resolved (the primary
 * store in multi-canvas setups, so all canvases share one registry).
 * WeakMap: bookkeeping dies with the store, nothing to clean up on unmount.
 */
const registries = new WeakMap<RootStore, Record<ResourceKind, KindRegistry>>()

function getKindRegistry(store: RootStore, kind: ResourceKind): KindRegistry {
  let registry = registries.get(store)
  if (!registry) {
    registry = {
      nodes: { valid: new Set(), staged: new Map() },
      uniforms: { valid: new Set(), staged: new Map() },
      buffers: { valid: new Set(), staged: new Map() },
      gpuStorage: { valid: new Set(), staged: new Map() },
    }
    registries.set(store, registry)
  }
  return registry[kind]
}

/** Resolve the authoritative store for shared TSL resources (see usePrimaryStore). */
function resolvePrimary(store: RootStore): RootStore {
  return store.getState().primaryStore ?? store
}

//* Render-phase API (staging & reuse) ==============================

/** Whether committed entries of a scope may be reused by creators. */
export function isScopeValid(store: RootStore, kind: ResourceKind, scopeKey: string): boolean {
  return getKindRegistry(store, kind).valid.has(scopeKey)
}

/** Entries staged for a scope this render pass, if any. */
export function peekStaged(store: RootStore, kind: ResourceKind, scopeKey: string): ResourceEntries | undefined {
  return getKindRegistry(store, kind).staged.get(scopeKey)
}

/**
 * Stage freshly created entries for the commit-phase flush. Called during
 * render — deliberately does NOT touch the store, so no subscriber is
 * notified mid-render. Staging is cumulative per scope: multiple components
 * contributing to one scope accumulate here and land in a single flush.
 */
export function stageEntries(store: RootStore, kind: ResourceKind, scopeKey: string, entries: ResourceEntries): void {
  const { staged } = getKindRegistry(store, kind)
  const current = staged.get(scopeKey)
  if (current) Object.assign(current, entries)
  else staged.set(scopeKey, { ...entries })
}

/**
 * Read the committed entries of a scope for reuse lookups. For the root
 * pseudo-scope this filters out scope sub-objects via the guard, so a scope
 * stored under the same name as a requested leaf is never returned as one.
 */
export function readCommittedScope(map: ResourceEntries, scopeKey: string, isLeaf: LeafGuard): ResourceEntries {
  if (scopeKey === ROOT_SCOPE) {
    const leaves: ResourceEntries = {}
    for (const [key, value] of Object.entries(map)) if (isLeaf(value)) leaves[key] = value
    return leaves
  }
  const scopeData = map[scopeKey]
  if (scopeData && typeof scopeData === 'object' && !isLeaf(scopeData)) return scopeData as ResourceEntries
  return {}
}

/**
 * A view of a committed resource map with this render pass's staged entries
 * overlaid. Used by `CreatorState` so a creator can see resources that a
 * sibling hook created earlier in the SAME render (e.g. a node creator
 * deriving from a uniform created two lines above) before they are flushed.
 * Returns the committed map untouched when nothing is staged.
 */
export function withStagedOverlay(store: RootStore, kind: ResourceKind, committed: ResourceEntries): ResourceEntries {
  const { staged } = getKindRegistry(store, kind)
  if (staged.size === 0) return committed

  const view = { ...committed }
  for (const [scopeKey, entries] of staged) {
    if (scopeKey === ROOT_SCOPE) Object.assign(view, entries)
    else view[scopeKey] = { ...(view[scopeKey] as ResourceEntries), ...entries }
  }
  return view
}

//* Commit-phase API (flush) ==============================

/**
 * Commit everything staged for a scope into the store — one immutable
 * `setState`, one observable transition. If the scope was invalidated, its
 * committed entries are REPLACED by the staged generation (root: leaf entries
 * replaced, scope sub-objects kept — they flush independently); if it is
 * still valid, staged entries merge in alongside other contributors'.
 *
 * Called from a commit-phase effect, where updating the store is legal and
 * React batches the resulting reader re-renders before paint. No-op when
 * nothing is staged, so it is safe to run on every commit.
 */
export function flushStagedScope(store: RootStore, kind: ResourceKind, scopeKey: string, isLeaf: LeafGuard): void {
  const registry = getKindRegistry(store, kind)
  const staged = registry.staged.get(scopeKey)
  if (!staged) return
  registry.staged.delete(scopeKey)

  const replace = !registry.valid.has(scopeKey)
  store.setState((state) => {
    const map = state[kind] as ResourceEntries
    if (scopeKey === ROOT_SCOPE) {
      if (!replace) return { [kind]: { ...map, ...staged } } as Partial<RootState>
      const next: ResourceEntries = {}
      for (const [key, value] of Object.entries(map)) if (!isLeaf(value)) next[key] = value
      return { [kind]: { ...next, ...staged } } as Partial<RootState>
    }
    const current = replace ? {} : ((map[scopeKey] as ResourceEntries) ?? {})
    return { [kind]: { ...map, [scopeKey]: { ...current, ...staged } } } as Partial<RootState>
  })
  registry.valid.add(scopeKey)
}

//* Invalidation API (HMR & rebuild) ==============================

/**
 * Mark a scope (or, without `scopeKey`, an entire kind) stale: committed
 * entries stay visible to readers but can no longer be reused by creators,
 * and anything staged pre-invalidation is dropped (it belongs to the old
 * generation — flushing it would mark the scope valid with stale entries).
 */
export function invalidateResource(store: RootStore, kind: ResourceKind, scopeKey?: string): void {
  const registry = getKindRegistry(store, kind)
  if (scopeKey === undefined) {
    registry.valid.clear()
    registry.staged.clear()
  } else {
    registry.valid.delete(scopeKey)
    registry.staged.delete(scopeKey)
  }
}

/**
 * Invalidate a scope (or a whole kind) and bump `_hmrVersion` so every
 * creator re-runs and re-registers a fresh generation. This is the shared
 * implementation behind the hooks' `rebuild*` utils and the standalone
 * `rebuildAll*` functions. The maps are intentionally NOT wiped — readers
 * keep the previous generation until the new one is flushed atomically.
 *
 * @param userScope - as documented on the utils: a scope name, `'root'` for
 *   root-level entries only, or `undefined` for everything of this kind.
 */
export function rebuildResource(store: RootStore, kind: ResourceKind, userScope?: string): void {
  const primary = resolvePrimary(store)
  invalidateResource(primary, kind, userScope === 'root' ? ROOT_SCOPE : userScope)
  primary.setState((state) => ({ _hmrVersion: state._hmrVersion + 1 }))
}

/** Invalidate every scope of every kind. The HMR entry point (see `clearHmrCaches`). */
export function invalidateAllResources(store: RootStore): void {
  for (const kind of RESOURCE_KINDS) invalidateResource(store, kind)
}

//* Shared removal helpers ==============================
// Explicit user-driven removal (`removeX`/`clearX` utils). Unlike rebuilds
// these DO remove committed entries — readers observing the removal is the
// requested behavior. Staged duplicates are dropped so a pending flush can't
// resurrect what was just removed.

/** Remove entries by name from the root level or a scope. */
export function removeResourceEntries(
  store: RootStore,
  kind: ResourceKind,
  names: string[],
  scope: string | undefined,
  isLeaf: LeafGuard,
): void {
  const staged = peekStaged(store, kind, scope ?? ROOT_SCOPE)
  if (staged) for (const name of names) delete staged[name]

  store.setState((state) => {
    const map = state[kind] as ResourceEntries
    if (scope) {
      const currentScope = { ...(map[scope] as ResourceEntries) }
      for (const name of names) delete currentScope[name]
      return { [kind]: { ...map, [scope]: currentScope } } as Partial<RootState>
    }
    const next = { ...map }
    for (const name of names) if (isLeaf(next[name])) delete next[name]
    return { [kind]: next } as Partial<RootState>
  })
}

/**
 * Clear entries — a scope name removes that scope entirely, `'root'` removes
 * root-level leaves only (scopes kept), `undefined` clears the whole map.
 */
export function clearResourceEntries(
  store: RootStore,
  kind: ResourceKind,
  scope: string | undefined,
  isLeaf: LeafGuard,
): void {
  const registry = getKindRegistry(store, kind)
  if (scope && scope !== 'root') registry.staged.delete(scope)
  else if (scope === 'root') registry.staged.delete(ROOT_SCOPE)
  else registry.staged.clear()

  store.setState((state) => {
    const map = state[kind] as ResourceEntries
    if (scope && scope !== 'root') {
      const { [scope]: _, ...rest } = map
      return { [kind]: rest } as Partial<RootState>
    }
    if (scope === 'root') {
      const next: ResourceEntries = {}
      for (const [key, value] of Object.entries(map)) if (!isLeaf(value)) next[key] = value
      return { [kind]: next } as Partial<RootState>
    }
    return { [kind]: {} } as Partial<RootState>
  })
}
