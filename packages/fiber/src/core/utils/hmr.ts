import { invalidateAllResources } from './resourceRegistry'
import type { RootStore } from '#types'

// NOTE: intentionally NOT re-exported from ./index — internal helper only.

/**
 * Invalidate all TSL resource caches on HMR and bump `_hmrVersion` so
 * creators re-run and register a fresh generation.
 *
 * The maps (`nodes`, `uniforms`, `buffers`, `gpuStorage`) are deliberately
 * NOT wiped: a wipe notifies every subscribed reader with an empty scope
 * before the creators have re-run, and the reconciler then strips the
 * corresponding `*Node` material props (the C16 black-scene failure).
 * Invalidation instead makes committed entries invisible to creator reuse
 * while readers keep the previous generation until the rebuilt one lands in
 * a single atomic transition (see `resourceRegistry.ts`).
 *
 * Resolves `primaryStore` first so multi-canvas setups invalidate the store
 * the shared resources actually live on.
 */
export function clearHmrCaches(store: RootStore): void {
  const primary = store.getState().primaryStore ?? store
  invalidateAllResources(primary)
  primary.setState((state) => ({ _hmrVersion: state._hmrVersion + 1 }))
}
