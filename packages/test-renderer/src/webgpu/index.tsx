/**
 * @fileoverview WebGPU Entry Point - Full WebGPU Support with Hooks
 *
 * Use this entry point when testing applications built on @react-three/fiber/webgpu.
 *
 * This entry provides:
 * - WebGPU context mocking for Node.js tests
 * - Automatic THREE extension with node materials
 *
 * The TSL hooks (useUniforms, useNodes, ...) live in @react-three/tsl; import them from there in
 * tests as in app code.
 *
 * Usage:
 *   import ReactThreeTestRenderer from '@react-three/test-renderer/webgpu'
 *   import { useUniforms } from '@react-three/tsl'
 */

import { act } from 'react'
import * as THREE from 'three/webgpu'
// All WebGPU hooks come from fiber's public entry, never from its source tree. Importing via
// relative `../../fiber/src/...` paths pulled fiber's internal `#three` / `#types` aliases into
// this package's bundle — unresolvable for consumers — and bundled a second copy of hooks whose
// module-level scoped stores must be shared with the fiber instance under test.
import {
  extend,
  _roots as mockRoots,
  createRoot,
  reconciler,
  useTextures,
  type TextureEntry,
  type TextureNode,
  type UseTexturesReturn,
} from '@react-three/fiber/webgpu'

import { mockWebGPU, unmockWebGPU } from '../WebGPUContext'
import { createTestRenderer } from '../createRenderer'
import { waitFor, type WaitOptions } from '../helpers/waitFor'

//* Initialize WebGPU Mocking ==============================
// Install mocks before any WebGPU code runs
mockWebGPU()

//* Initialize Test Renderer ==============================

const renderer = createTestRenderer({
  THREE,
  createRoot,
  mockRoots,
  reconciler,
  act,
  extend,
  mode: 'webgpu',
})

//* Exports ==============================

// Core test renderer API
export const { create } = renderer
export { act, waitFor }
export type { WaitOptions }

// Texture registry hook (re-exported from fiber/webgpu)
export { useTextures }

// Texture types
export type { TextureEntry, TextureNode, UseTexturesReturn }

// Mock utilities (for advanced use cases)
export { mockWebGPU, unmockWebGPU }

// Re-export types namespace
export * as ReactThreeTest from '../types'

// Default export
export default { create, act, waitFor }
