import { useMemo } from 'react'
import { useStore } from './index'

//* Type Imports ==============================
import type { RootState, RootStore } from '#types'

/**
 * Resolve the authoritative store for shared TSL resources.
 *
 * In multi-canvas WebGPU mode, shared resources (nodes, uniforms, buffers, GPU
 * storage) live on the PRIMARY canvas's store so every canvas sees the same
 * resources. `primaryStore` is set on every store during renderer init: it
 * self-references on the primary/single canvas and points at the primary on
 * secondaries. It is `null` until init completes, so we fall back to the local
 * store (also the steady state for single-canvas / WebGL).
 *
 * @internal
 */
function resolvePrimary(local: RootStore): RootStore {
  return local.getState().primaryStore ?? local
}

/**
 * Imperative handle to the primary store for `getState()` / `setState()`.
 * Falls back to the local store when `primaryStore` is absent.
 */
export function usePrimaryStore(): RootStore {
  const local = useStore()
  const primary = local.getState().primaryStore
  return useMemo(() => primary ?? local, [primary, local])
}

/**
 * Reactive selector against the PRIMARY store (mirrors {@link useThree} but
 * subscribes to the primary so a secondary canvas re-renders when the primary's
 * shared TSL state changes). Falls back to the local store when `primaryStore`
 * is absent.
 *
 * Resolves the store and makes exactly ONE unconditional bound-store hook call
 * (`primary(selector, eq)`); zustand re-reads `subscribe`/`getSnapshot` each
 * render, so the one-time `null → primary` init transition is safe and does not
 * violate the rules of hooks.
 */
export function usePrimaryThree<T = RootState>(
  selector: (state: RootState) => T = (state) => state as unknown as T,
  equalityFn?: (a: T, b: T) => boolean,
): T {
  const local = useStore()
  const primary = resolvePrimary(local)
  return primary(selector, equalityFn)
}
