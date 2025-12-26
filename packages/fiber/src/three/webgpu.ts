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
export { Inspector } from 'three/addons/inspector/Inspector.js'

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
