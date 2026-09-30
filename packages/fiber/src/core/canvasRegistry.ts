/**
 * @fileoverview Registry of primary canvases that other canvases share a renderer with
 *
 * Enables multi-canvas WebGPU rendering where multiple Canvas components share
 * a single WebGPURenderer using Three.js CanvasTarget API.
 *
 * Primary canvas: `<Canvas primary>` (optionally with an `id`). It owns its renderer and registers
 * here under its id, or under a default slot when it has none.
 * Secondary canvas: any other WebGPU canvas while one primary exists (or `share="id"` to name one).
 * It borrows the primary's renderer and draws into its own element through a CanvasTarget.
 *
 * A primary exists in two stages:
 * - announced: synchronously, as soon as it mounts (a Canvas insertion effect, or the first
 *   `configure({ primary: true })`), before its renderer exists. A canvas configuring in the same
 *   commit therefore knows a primary is coming and waits for it instead of building its own.
 * - registered: once its renderer is initialized, and secondaries can borrow it.
 *
 * Announcements are keyed by an owner token (one per Canvas / root) so StrictMode and Fast Refresh,
 * which set a Canvas up again with the same token, are idempotent.
 */

import type { WebGPURenderer } from 'three/webgpu'
import type { RootStore } from '#types'
import { isDevelopment } from './utils/notices'

/** The registry key of a `<Canvas primary>` without an `id`. Not a valid DOM id, so no user id collides. */
export const DEFAULT_PRIMARY = '\u0000r3f:primary'

export interface PrimaryCanvasEntry {
  /** The WebGPURenderer instance owned by this primary canvas */
  renderer: WebGPURenderer
  /** The zustand store for this canvas */
  store: RootStore
  /** The primary's scheduler root id; a sharing canvas renders after it by default */
  rootId?: string
}

interface RegisteredEntry extends PrimaryCanvasEntry {
  token?: object
}

/** Registry of primary canvases keyed by their id (or DEFAULT_PRIMARY) */
const primaryRegistry = new Map<string, RegisteredEntry>()

/** Owners that announced a primary on each key, before or after it registered */
const announcements = new Map<string, Set<object>>()

/** Owners whose Canvas was cleaned up and may be set up again in the same commit (Fast Refresh, remount) */
const withdrawing = new Set<object>()

/** Subscribers waiting for a primary canvas to register */
const pendingSubscribers = new Map<string, Array<(entry: PrimaryCanvasEntry | null) => void>>()

/** Canvases that built their own WebGPU renderer and would have shared one had a primary existed */
const standaloneRoots = new Set<object>()

/** Owners already told about standalone canvases, so each primary warns once */
const warnedLatePrimary = new WeakSet<object>()

/** A readable name for a registry key in messages */
export function describePrimary(key: string): string {
  return key === DEFAULT_PRIMARY ? '<Canvas primary>' : `<Canvas id="${key}" primary>`
}

function notify(key: string, entry: PrimaryCanvasEntry | null) {
  const subscribers = pendingSubscribers.get(key)
  if (!subscribers) return
  pendingSubscribers.delete(key)
  subscribers.forEach((callback) => callback(entry))
}

/** Whether `key` has a live owner: an announcement or a registration not being withdrawn */
function isLive(key: string): boolean {
  const owners = announcements.get(key)
  if (owners) for (const owner of owners) if (!withdrawing.has(owner)) return true
  const entry = primaryRegistry.get(key)
  return !!entry && !(entry.token && withdrawing.has(entry.token))
}

/**
 * Announce a primary on `key` before its renderer exists. Idempotent per owner; also cancels a
 * pending withdrawal by the same owner (a Canvas set up again in the same commit).
 */
export function announcePrimary(key: string, owner: object): void {
  withdrawing.delete(owner)
  let owners = announcements.get(key)
  if (!owners) announcements.set(key, (owners = new Set()))
  if (owners.has(owner)) return
  owners.add(owner)

  // Sharing is decided when a canvas creates its renderer: canvases that already built their own
  // are not adopted after the fact
  if (standaloneRoots.size > 0 && !warnedLatePrimary.has(owner) && isDevelopment()) {
    warnedLatePrimary.add(owner)
    console.warn(
      `R3F: ${describePrimary(key)} mounted after ${standaloneRoots.size} other WebGPU canvas(es) had already ` +
        'created their own renderer; those keep it and do not share the primary. Mount the primary with or ' +
        'before the canvases that share it, or give them share="id" so they wait for it.',
    )
  }
}

/**
 * Mark an owner as possibly going away. It stops counting as a primary for conflict checks and
 * auto-sharing until it announces again (same commit) or withdraws for good.
 */
export function markWithdrawing(owner: object): void {
  withdrawing.add(owner)
}

/**
 * Withdraw an owner's announcement and its registration. Canvases waiting to auto-share on this
 * key fall back to their own renderer once no owner is left. Existing borrowers keep their lease.
 */
export function withdrawPrimary(key: string, owner: object): void {
  withdrawing.delete(owner)
  const owners = announcements.get(key)
  if (owners) {
    owners.delete(owner)
    if (owners.size === 0) announcements.delete(key)
  }
  const entry = primaryRegistry.get(key)
  if (entry?.token === owner) primaryRegistry.delete(key)
  if (!isLive(key)) notify(key, null)
}

/**
 * Whether another owner claimed `key` first: announced before `owner`, or registered. The first
 * primary on a key keeps it, so of two primaries mounting together only the second one fails.
 */
export function primaryConflict(key: string, owner: object): boolean {
  const owners = announcements.get(key)
  if (owners) {
    for (const other of owners) {
      if (other === owner) break
      if (!withdrawing.has(other)) return true
    }
  }
  const entry = primaryRegistry.get(key)
  return !!entry && entry.token !== owner && !(entry.token && withdrawing.has(entry.token))
}

/** Keys of every live primary, announced or registered. */
export function livePrimaryKeys(): string[] {
  const keys = new Set<string>([...announcements.keys(), ...primaryRegistry.keys()])
  return [...keys].filter(isLive)
}

/**
 * Record a canvas that owns a WebGPU renderer only because no primary existed when it was created.
 * @returns Function that removes it again (on unmount)
 */
export function trackStandalone(owner: object): () => void {
  standaloneRoots.add(owner)
  return () => {
    standaloneRoots.delete(owner)
  }
}

/**
 * Register a primary canvas that can be targeted by secondary canvases.
 *
 * @param id - Registry key: the canvas id, or DEFAULT_PRIMARY
 * @param renderer - The WebGPURenderer owned by this canvas
 * @param store - The zustand store for this canvas
 * @param options - The owner token that announced it and its scheduler root id
 * @returns Cleanup function to unregister on unmount
 */
export function registerPrimary(
  id: string,
  renderer: WebGPURenderer,
  store: RootStore,
  options: { token?: object; rootId?: string } = {},
): () => void {
  // An owner that withdrew while its renderer was being created (the primary unmounted mid-setup)
  // must not publish a renderer no one will withdraw again
  if (options.token && !announcements.get(id)?.has(options.token)) return () => {}

  if (primaryRegistry.has(id)) {
    console.warn(`Canvas with id="${id}" already registered. Overwriting.`)
  }

  const entry: RegisteredEntry = { renderer, store, rootId: options.rootId, token: options.token }
  primaryRegistry.set(id, entry)

  // Notify any waiting secondary canvases
  notify(id, entry)

  return () => {
    // Only unregister if the current entry matches (prevents race conditions)
    const currentEntry = primaryRegistry.get(id)
    if (currentEntry?.renderer === renderer) {
      primaryRegistry.delete(id)
    }
  }
}

/**
 * Get a registered primary canvas by id.
 *
 * @param id - The id of the primary canvas to look up
 * @returns The primary canvas entry or undefined if not found
 */
export function getPrimary(id: string): PrimaryCanvasEntry | undefined {
  return primaryRegistry.get(id)
}

function subscribe(id: string, callback: (entry: PrimaryCanvasEntry | null) => void): () => void {
  if (!pendingSubscribers.has(id)) pendingSubscribers.set(id, [])
  pendingSubscribers.get(id)!.push(callback)
  return () => {
    const subscribers = pendingSubscribers.get(id)
    if (!subscribers) return
    const index = subscribers.indexOf(callback)
    if (index !== -1) subscribers.splice(index, 1)
    if (subscribers.length === 0) pendingSubscribers.delete(id)
  }
}

/**
 * Wait for a primary canvas to be registered (`share="id"`).
 * Returns immediately if already registered, otherwise waits, even through a primary remounting.
 *
 * @param id - The id of the primary canvas to wait for
 * @param timeout - Optional timeout in ms (default: 5000)
 * @returns Promise that resolves with the primary canvas entry
 */
export function waitForPrimary(id: string, timeout = 5000): Promise<PrimaryCanvasEntry> {
  // If already registered, return immediately
  const existing = primaryRegistry.get(id)
  if (existing) {
    return Promise.resolve(existing)
  }

  // Otherwise, subscribe and wait. A withdrawal notifies with null: keep waiting for the next one
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {}
    const timeoutId = setTimeout(() => {
      unsubscribe()
      reject(
        new Error(
          `Timeout waiting for canvas with id="${id}". Make sure a <Canvas id="${id}" primary> is mounted ` +
            `for share="${id}".`,
        ),
      )
    }, timeout)

    const callback = (entry: PrimaryCanvasEntry | null) => {
      if (!entry) {
        unsubscribe = subscribe(id, callback)
        return
      }
      clearTimeout(timeoutId)
      resolve(entry)
    }
    unsubscribe = subscribe(id, callback)
  })
}

/**
 * Wait for the primary announced on `key` to register (automatic sharing). Resolves `null` when no
 * primary is live on the key, now or once every owner has withdrawn: the canvas then builds its own
 * renderer instead of waiting for one that is not coming.
 *
 * @param key - The announced primary's registry key
 * @param timeout - Optional timeout in ms (default: 5000)
 */
export function waitForAnnouncedPrimary(key: string, timeout = 5000): Promise<PrimaryCanvasEntry | null> {
  const existing = primaryRegistry.get(key)
  if (existing && isLive(key)) return Promise.resolve(existing)
  if (!isLive(key)) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe()
      reject(
        new Error(
          `Timeout waiting for ${describePrimary(key)} to create its renderer. A canvas mounted next to it shares ` +
            'its renderer automatically; pass share={false} to give it its own.',
        ),
      )
    }, timeout)
    const unsubscribe = subscribe(key, (entry) => {
      clearTimeout(timeoutId)
      resolve(entry)
    })
  })
}

/**
 * Check if a primary canvas with the given id exists.
 *
 * @param id - The id to check
 * @returns True if a primary canvas with this id is registered
 */
export function hasPrimary(id: string): boolean {
  return primaryRegistry.has(id)
}

/**
 * Unregister a primary canvas. Called on unmount.
 *
 * @param id - The id of the primary canvas to unregister
 */
export function unregisterPrimary(id: string): void {
  primaryRegistry.delete(id)
}

/**
 * Get all registered primary canvas ids. Useful for debugging.
 */
export function getPrimaryIds(): string[] {
  return Array.from(primaryRegistry.keys())
}

/** Clear announcements and standalone tracking. Test helper; registrations go via unregisterPrimary. */
export function resetCanvasRegistry(): void {
  primaryRegistry.clear()
  announcements.clear()
  withdrawing.clear()
  pendingSubscribers.clear()
  standaloneRoots.clear()
}
