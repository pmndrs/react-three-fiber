import { registerRootExtension } from '../../core/extensions'
import { clearHmrCaches } from '../../core/utils/hmr'

import type { RootState, RootStore } from '#types'

// The TSL resource hooks as a root extension -- the shape they will have once they move to
// @react-three/tsl. Core no longer calls into TSL code; it notifies extensions.
//
// Shared TSL resources live on the PRIMARY canvas's RootState (the hooks write there through
// `primaryStore`). Portals see them for free: a portal's state re-copies its parent's. A secondary
// canvas has its own store, so this extension gives it the primary's maps and keeps them in step --
// `state.uniforms` in a secondary's useFrame, useThree or creators is the primary's map object.

/** The RootState fields a secondary canvas shares with its primary. */
const SHARED_KEYS = ['uniforms', 'nodes', 'buffers', 'gpuStorage', '_hmrVersion'] as const

/** Unsubscribe functions for secondaries currently following their primary. */
const following = new WeakMap<RootStore, () => void>()

function followPrimary(store: RootStore): void {
  const primary = store.getState().primaryStore
  // A primary (or a single canvas) owns its maps; there is nothing to follow.
  if (!primary || primary === store) return

  const sync = () => {
    const source = primary.getState()
    const target = store.getState()
    let patch: Partial<RootState> | null = null
    // The maps are replaced, never mutated, on every change, so comparing references is enough and
    // assigning them shares the same objects -- no copying. Unrelated primary writes (size, camera,
    // ...) change none of them, so they cause no write here and no re-render on the secondary.
    for (const key of SHARED_KEYS) {
      if (target[key] !== source[key]) (patch ??= {})[key] = source[key] as never
    }
    if (patch) store.setState(patch)
  }

  sync()
  following.set(store, primary.subscribe(sync))
}

function stopFollowing(store: RootStore): void {
  following.get(store)?.()
  following.delete(store)
}

let registered = false

/**
 * Register the TSL extension. Called once at module load by the hooks' shared module, so setup
 * happens when a root is configured (or at import, for roots that already exist) -- never during a
 * React render, where writing to a secondary's store would warn.
 */
export function ensureTSLExtension(): void {
  if (registered) return
  registered = true
  registerRootExtension({
    name: '@react-three/tsl',
    setup: followPrimary,
    dispose: stopFollowing,
    // Resolves primaryStore itself, so every canvas sharing a renderer refreshes the same resources.
    hmr: clearHmrCaches,
  })
}
