import { useMemo } from 'react'
import { useStore } from '@react-three/fiber/extension'
import type { RootState, RootStore } from '@react-three/fiber/extension'

/**
 * Resolve the store shared TSL resources live on.
 *
 * In multi-canvas WebGPU mode they live on the PRIMARY canvas's RootState (secondaries hold the same
 * map objects, see ./tslExtension). `primaryStore` is set on every store during renderer init: it
 * self-references on the primary/single canvas and points at the primary on secondaries. It is
 * `null` until init completes, so we fall back to the local store.
 */
function resolvePrimary(local: RootStore): RootStore {
  return local.getState().primaryStore ?? local
}

/** Imperative handle to the primary store for `getState()` / `setState()`. */
export function usePrimaryStore(): RootStore {
  const local = useStore()
  const primary = local.getState().primaryStore
  return useMemo(() => primary ?? local, [primary, local])
}

/**
 * Reactive selector against the PRIMARY store. Makes exactly one unconditional bound-store hook call;
 * zustand re-reads `subscribe`/`getSnapshot` each render, so the one-time `null -> primary` init
 * transition is safe.
 */
export function usePrimaryThree<T = RootState>(
  selector: (state: RootState) => T = (state) => state as unknown as T,
  equalityFn?: (a: T, b: T) => boolean,
): T {
  const local = useStore()
  const primary = resolvePrimary(local)
  return primary(selector, equalityFn)
}
