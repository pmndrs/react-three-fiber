/**
 * @fileoverview Registry for primary canvases that can be targeted by secondary canvases
 *
 * Enables multi-canvas WebGPU rendering where multiple Canvas components share
 * a single WebGPURenderer using Three.js CanvasTarget API.
 *
 * Primary canvas: Has `id` prop, creates its own renderer, registers here
 * Secondary canvas: Has `target="id"` prop, shares primary's renderer via CanvasTarget
 */

import type { WebGPURenderer } from '#three'
import type { RootStore } from '#types'

export interface PrimaryCanvasEntry {
  /** The WebGPURenderer instance owned by this primary canvas */
  renderer: WebGPURenderer
  /** The zustand store for this canvas */
  store: RootStore
}

/** Registry of primary canvases keyed by their id */
const primaryRegistry = new Map<string, PrimaryCanvasEntry>()

/** Subscribers waiting for a primary canvas to register */
const pendingSubscribers = new Map<string, Array<(entry: PrimaryCanvasEntry) => void>>()

/**
 * Register a primary canvas that can be targeted by secondary canvases.
 *
 * @param id - Unique identifier for this primary canvas
 * @param renderer - The WebGPURenderer owned by this canvas
 * @param store - The zustand store for this canvas
 * @returns Cleanup function to unregister on unmount
 */
export function registerPrimary(id: string, renderer: WebGPURenderer, store: RootStore): () => void {
  if (primaryRegistry.has(id)) {
    console.warn(`Canvas with id="${id}" already registered. Overwriting.`)
  }

  const entry: PrimaryCanvasEntry = { renderer, store }
  primaryRegistry.set(id, entry)

  // Notify any waiting secondary canvases
  const subscribers = pendingSubscribers.get(id)
  if (subscribers) {
    subscribers.forEach((callback) => callback(entry))
    pendingSubscribers.delete(id)
  }

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

/**
 * Wait for a primary canvas to be registered.
 * Returns immediately if already registered, otherwise waits.
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

  // Otherwise, subscribe and wait
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      // Remove this subscriber on timeout
      const subscribers = pendingSubscribers.get(id)
      if (subscribers) {
        const index = subscribers.indexOf(callback)
        if (index !== -1) subscribers.splice(index, 1)
        if (subscribers.length === 0) pendingSubscribers.delete(id)
      }
      reject(new Error(`Timeout waiting for canvas with id="${id}". Make sure a <Canvas id="${id}"> is mounted.`))
    }, timeout)

    const callback = (entry: PrimaryCanvasEntry) => {
      clearTimeout(timeoutId)
      resolve(entry)
    }

    // Add to pending subscribers
    if (!pendingSubscribers.has(id)) {
      pendingSubscribers.set(id, [])
    }
    pendingSubscribers.get(id)!.push(callback)
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
