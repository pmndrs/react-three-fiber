import { registerRootExtension } from '@react-three/fiber/extension'
import { clearHmrCaches } from './hmr'

import type { RootState, RootStore } from '@react-three/fiber/extension'

// The TSL resource hooks as a root extension. Core knows nothing about TSL; this adds the fields to
// RootState (see types/augment.d.ts) and keeps them shared per renderer.
//
// Shared TSL resources live on the PRIMARY canvas's RootState (the hooks write there through
// `primaryStore`). Portals inherit them from their parent: core passes inherited parent fields
// through, while a portal's own scene, camera and state-prop fields stay its own. A secondary canvas
// has its own store, so this extension gives it the primary's maps and keeps them in step --
// `state.uniforms` in a secondary's useFrame, useThree or creators is the primary's map object.

/** The RootState fields a secondary canvas shares with its primary. */
const SHARED_KEYS = ['uniforms', 'nodes', 'buffers', 'gpuStorage', '_hmrVersion'] as const

/** Unsubscribe functions for secondaries currently following their primary. */
const following = new WeakMap<RootStore, () => void>()

/** Fresh, empty resource maps for a primary (or single) canvas. */
export function createResourceState(): Pick<RootState, (typeof SHARED_KEYS)[number]> {
  return { uniforms: {}, nodes: {}, buffers: {}, gpuStorage: {}, _hmrVersion: 0 }
}

function setup(store: RootStore): Partial<RootState> | void {
  const primary = store.getState().primaryStore
  // A primary (or a single canvas) owns its maps. Any renderer: test-renderer/webgpu runs the hooks
  // on WebGL roots.
  if (!primary || primary === store) return createResourceState()
  followPrimary(store, primary)
}

function followPrimary(store: RootStore, primary: RootStore): void {
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
 * Register the TSL extension. Called once when the package loads, so setup happens when a root is
 * configured (or at import, for roots that already exist) -- never during a React render, where
 * writing to a store would warn.
 */
export function ensureTSLExtension(): void {
  if (registered) return
  registered = true
  registerRootExtension({
    name: '@react-three/tsl',
    setup,
    dispose: stopFollowing,
    // Resolves primaryStore itself, so every canvas sharing a renderer refreshes the same resources.
    hmr: clearHmrCaches,
  })
}
