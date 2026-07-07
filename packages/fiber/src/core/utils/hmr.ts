import type { RootStore } from '#types'

// NOTE: intentionally NOT re-exported from ./index — internal helper only.

/**
 * Clear all TSL resource caches on HMR and bump `_hmrVersion` so creators re-run.
 *
 * All four maps must be cleared: leaving `buffers`/`gpuStorage` in place lets
 * particle/compute buffers and storage textures go stale after a hot reload.
 */
export function clearHmrCaches(store: RootStore): void {
  store.setState((state) => ({
    nodes: {},
    uniforms: {},
    buffers: {},
    gpuStorage: {},
    _hmrVersion: state._hmrVersion + 1,
  }))
}
