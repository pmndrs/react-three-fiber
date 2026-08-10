/**
 * @fileoverview Internal Three.js re-exports - LEGACY ENTRY
 *
 * Pure WebGL path - no WebGPU imports.
 * Use this for the legacy import path: @react-three/fiber/legacy
 *
 * This keeps bundle size minimal for apps that don't need WebGPU.
 */

//* Build Flags ==============================
// Legacy build: WebGL only, no WebGPU
export const R3F_BUILD_LEGACY = true
export const R3F_BUILD_WEBGPU = false

//* Core Three.js (WebGL path) ==============================
export * from 'three'

//* Stubs for WebGPU-only features ==============================
// These prevent type/runtime errors in shared code
// They should never actually be used in legacy builds

// Inspector doesn't exist in legacy - stub it.
// Shape must match the other #three barrels: a type plus a lazy loader.
export type Inspector = never

/** Not available on the legacy (WebGL-only) entry. */
export async function loadInspector(): Promise<never> {
  throw new Error('Inspector is not available in legacy builds. Use @react-three/fiber/webgpu instead.')
}

// WebGPURenderer stub - throws if someone tries to use it
export const WebGPURenderer = class WebGPURenderer {
  constructor() {
    throw new Error('WebGPURenderer is not available in legacy builds. Use @react-three/fiber/webgpu instead.')
  }
}

//* RenderTarget Compatibility ==============================
// Alias WebGLRenderTarget for useRenderTarget hook
export { WebGLRenderTarget as RenderTargetCompat } from 'three'
// Stub to prevent import errors (never instantiated due to build flags)
export const RenderTarget = null as any

//* CubeRenderTarget Compatibility ==============================
// Alias WebGLCubeRenderTarget for Environment's cubemap capture
export { WebGLCubeRenderTarget as CubeRenderTargetCompat } from 'three'
// Stub to prevent import errors (never instantiated due to build flags)
export const CubeRenderTarget = null as any
