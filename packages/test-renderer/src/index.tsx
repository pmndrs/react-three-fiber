/**
 * @fileoverview Default Entry Point - WebGPU
 *
 * Use this entry point when testing applications that use:
 *   import { Canvas } from '@react-three/fiber'
 *
 * `@react-three/fiber` renders with WebGPURenderer, so this entry mocks WebGPU and creates
 * WebGPU-mode canvases, like '@react-three/test-renderer/webgpu'.
 * For WebGL-only testing (`@react-three/fiber/legacy`), use '@react-three/test-renderer/legacy'.
 *
 * Usage:
 *   import ReactThreeTestRenderer from '@react-three/test-renderer'
 */

import { act } from 'react'
import { _roots as mockRoots, createRoot, reconciler } from '@react-three/fiber'

import { mockWebGPU } from './WebGPUContext'
import { createTestRenderer } from './createRenderer'
import { waitFor, type WaitOptions } from './helpers/waitFor'

//* Initialize WebGPU Mocking ==============================
// Install mocks before any WebGPU code runs
mockWebGPU()

//* Initialize Test Renderer ==============================

const renderer = createTestRenderer({
  createRoot,
  mockRoots,
  reconciler,
  act,
  mode: 'webgpu', // The root entry renders with WebGPURenderer
})

//* Exports ==============================

export const { create } = renderer
export { act, waitFor }
export type { WaitOptions }

export * as ReactThreeTest from './types'
export default { create, act, waitFor }
