//* Three's shared core, at runtime ==============================
// Core never imports `three` or `three/webgpu` for a value: either one would drag its renderer into
// every app's eager graph (see types/provider.d.ts). What core needs from three is the shared core --
// `Vector3`, `Scene`, `Raycaster`, the constants -- and both flavours export the very same objects
// for those, from one `three.core.js`. So the first renderer support a root loads registers its
// namespace here, and every root after that reads the same classes.
//
// Renderer-specific classes (`WebGLRenderer`, `CanvasTarget`, node materials, ...) are never read
// from here. They live on the support object of the root that loaded them: `state.internal.support`.

import type { ThreeCore, ThreeNamespace } from '#types'

let current: ThreeCore | null = null
let resolve: ((three: ThreeCore) => void) | null = null
let ready: Promise<ThreeCore> | null = null

/** @internal Called by `configure()` once a root's renderer support is loaded. First registration wins. */
export function registerThree(namespace: ThreeNamespace): void {
  if (current) return
  current = namespace as ThreeCore
  resolve?.(current)
  resolve = null
}

/** Whether any root has loaded a renderer yet. */
export function hasThree(): boolean {
  return current !== null
}

/**
 * Three's shared core: the classes and constants `three` and `three/webgpu` have in common.
 * Available once the first root's renderer support is loaded (during `configure()`), which is
 * before any element renders, any hook runs, or `onCreated` fires.
 */
export function getThree(): ThreeCore {
  if (!current) {
    throw new Error(
      'R3F: three is not loaded yet. Three.js classes become available once a <Canvas> (or createRoot) has ' +
        'configured its renderer; await that first, or import the class you need from three directly.',
    )
  }
  return current
}

/** Resolves with three's shared core as soon as a root has loaded one. */
export function whenThree(): Promise<ThreeCore> {
  if (current) return Promise.resolve(current)
  ready ??= new Promise<ThreeCore>((r) => (resolve = r))
  return ready
}

/** @internal Test-only: forget the registered namespace so a test can start from nothing. */
export function __resetThree(): void {
  current = null
  ready = null
  resolve = null
}
