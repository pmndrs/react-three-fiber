/**
 * @fileoverview Renderer ownership and lifetime.
 *
 * Ownership is decided once, when R3F obtains a renderer. R3F owns what it builds: the default
 * renderer, one built from a props object, and one returned by a factory, which R3F calls once per
 * root. A renderer instance passed in belongs to the caller, and R3F never disposes it.
 *
 * Every root that renders with a renderer holds a lease on it: the root that obtained it, and each
 * secondary canvas that borrows it through a CanvasTarget. An owned renderer is disposed when its
 * last lease is released, so a primary that unmounts before its secondaries cannot dispose the
 * renderer they still draw with.
 */

import type { WebGLRenderer, WebGPURenderer } from '#three'

type Renderer = WebGLRenderer | WebGPURenderer

interface LeaseRecord {
  owned: boolean
  leases: number
}

/** Keyed by renderer: every root sharing a renderer shares its record. */
const records = new WeakMap<Renderer, LeaseRecord>()

function take(renderer: Renderer, record: LeaseRecord): () => void {
  record.leases++
  let released = false
  return () => {
    if (released) return
    released = true
    if (--record.leases > 0) return
    records.delete(renderer)
    if (record.owned) disposeRenderer(renderer)
  }
}

/**
 * Take a lease for the root that obtained `renderer`. Returns its release, which is idempotent.
 * A renderer that is already leased keeps the ownership it was first leased with.
 */
export function leaseRenderer(renderer: Renderer, owned: boolean): () => void {
  let record = records.get(renderer)
  if (!record) records.set(renderer, (record = { owned, leases: 0 }))
  return take(renderer, record)
}

/**
 * Take a lease for a root that borrows another root's renderer. Throws when that renderer has no
 * lease left, which means its owner already unmounted and released it.
 */
export function borrowRenderer(renderer: Renderer): () => void {
  const record = records.get(renderer)
  if (!record) throw new Error('R3F: cannot share a renderer whose canvas has already unmounted')
  return take(renderer, record)
}

/**
 * Free an R3F-owned renderer. Only called from committed teardown, after the renderer's init has
 * settled, so disposal never races initialization.
 */
export function disposeRenderer(renderer: Renderer): void {
  // three's WebGPURenderer.dispose() starts init when init never ran, and rejects unhandled when it
  // failed. Either way there is nothing to free yet
  if ((renderer as WebGPURenderer).hasInitialized?.() === false) return
  const disposed: unknown = renderer.dispose()
  // WebGPURenderer.dispose() is async from three r186
  if (typeof (disposed as PromiseLike<void> | undefined)?.then === 'function') {
    ;(disposed as PromiseLike<void>).then(undefined, (error) => console.warn('[R3F] Error disposing renderer', error))
  }
  // WebGLRenderer.dispose() frees programs and caches but keeps the context until garbage
  // collection, and browsers cap how many WebGL contexts may be live. WebGPURenderer has no
  // forceContextLoss: its backend releases the context inside dispose()
  ;(renderer as WebGLRenderer).forceContextLoss?.()
}
