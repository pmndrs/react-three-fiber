/**
 * @fileoverview Internal Three.js re-exports - DEFAULT ENTRY
 *
 * This is the single source of truth for Three.js imports within R3F.
 * All internal code should import from '#three' (or '../three' relative).
 *
 * DEFAULT behavior (root import):
 * - Exports from three/webgpu (the new standard)
 * - Also exports WebGLRenderer for backwards compatibility (with deprecation)
 * - Both renderer types available, runtime decides which to use
 *
 * For explicit legacy or webgpu-only builds, use:
 * - #three/legacy - WebGL only, no WebGPU
 * - #three/webgpu - WebGPU only, no WebGL legacy
 */

//* Build Flags ==============================
// These flags indicate what's available in this build
// Bundlers can tree-shake dead branches based on these constants
export const R3F_BUILD_LEGACY = true
export const R3F_BUILD_WEBGPU = true

//* Core Three.js (from WebGPU path - superset of core) ==============================
export * from 'three/webgpu'

//* WebGL Legacy Support (deprecated) ==============================
// These are re-exported for backwards compatibility
// Usage triggers deprecation warnings at runtime via notices.ts
export { WebGLRenderer } from 'three'
// WebGLRendererParameters isn't exported from main 'three' entry in @types/three@0.181.0+
// Import directly from internal path
export type { WebGLRendererParameters } from 'three/src/renderers/WebGLRenderer.js'

//* Addons ==============================
export { Inspector } from 'three/addons/inspector/Inspector.js'
