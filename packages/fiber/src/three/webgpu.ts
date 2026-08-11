/**
 * @fileoverview Internal Three.js re-exports - WEBGPU ONLY ENTRY
 *
 * Pure WebGPU path - no WebGL legacy.
 * Use this for the explicit webgpu import path: @react-three/fiber/webgpu
 *
 * This is for apps that want ONLY WebGPU with no legacy fallback.
 * Attempting to use WebGLRenderer will cause type/runtime errors (intentional).
 */

//* Build Flags ==============================
// WebGPU-only build: no legacy WebGL
export const R3F_BUILD_LEGACY = false
export const R3F_BUILD_WEBGPU = true

//* Core Three.js (WebGPU path) ==============================
export * from 'three/webgpu'

//* Addons ==============================
// Inspector is exported as a TYPE ONLY, plus a lazy loader.
//
// A static re-export here would poison the module graph of every consumer:
// three/addons/inspector/Inspector.js imports { REVISION } from 'three/webgpu',
// which this file is itself mid-evaluation of. Under Turbopack (the Next.js 16
// default) that cycle resolves the namespace to undefined and throws
// "Cannot read properties of undefined (reading 'REVISION')" on import.
// See https://github.com/pmndrs/react-three-fiber/issues/3846
//
// The inspector is opt-in devtooling (state.inspector defaults to null), so it
// has no business in the eager graph. Anything that wants it must await
// loadInspector(), which keeps the cycle inside a dynamic import.
export type { Inspector } from 'three/addons/inspector/Inspector.js'

/** Lazily load the three Inspector. Keeps it out of the eager module graph — see note above. */
export async function loadInspector() {
  const { Inspector } = await import('three/addons/inspector/Inspector.js')
  return Inspector
}

//* Stubs for legacy-only features ==============================
// WebGLRenderer stub - throws if someone tries to use it in webgpu-only build
export const WebGLRenderer = class WebGLRenderer {
  constructor() {
    throw new Error(
      'WebGLRenderer is not available in webgpu-only builds. Use @react-three/fiber or @react-three/fiber/legacy instead.',
    )
  }
}

// Type stubs for legacy types (never actually used)
export type WebGLRendererParameters = never
export type WebGLShadowMap = never

//* RenderTarget Compatibility ==============================
// Alias RenderTarget for useRenderTarget hook
export { RenderTarget as RenderTargetCompat } from 'three/webgpu'
// Stub to prevent import errors (never instantiated due to build flags)
export const WebGLRenderTarget = null as any

//* CubeRenderTarget Compatibility ==============================
// three's WebGPU-compatible cube render target. `WebGLCubeRenderTarget` is not exported from
// 'three/webgpu' — CubeRenderTarget is its documented WebGPURenderer-compatible counterpart.
export { CubeRenderTarget as CubeRenderTargetCompat } from 'three/webgpu'
// Stub to prevent import errors (never instantiated due to build flags)
export const WebGLCubeRenderTarget = null as any
