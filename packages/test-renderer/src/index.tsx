/**
 * @fileoverview Default Entry Point - WebGL/WebGPU Auto-Detection
 *
 * Use this entry point when testing applications that use:
 *   import { Canvas } from '@react-three/fiber'
 *
 * This is the default entry that works with the standard fiber import.
 * For WebGPU-specific hook testing, use '@react-three/test-renderer/webgpu'.
 * For legacy WebGL-only testing, use '@react-three/test-renderer/legacy'.
 *
 * Usage:
 *   import ReactThreeTestRenderer from '@react-three/test-renderer'
 */

import * as THREE from 'three'
import { extend, _roots as mockRoots, createRoot, reconciler, act } from '@react-three/fiber'

import { createTestRenderer } from './createRenderer'
import type { WaitOptions } from './helpers/waitFor'
import { waitFor } from './helpers/waitFor'

//* Initialize Test Renderer ==============================

const renderer = createTestRenderer({
  THREE,
  createRoot,
  mockRoots,
  reconciler,
  act,
  extend,
  mode: 'webgl', // Default uses WebGL context
})

//* Exports ==============================

export const { create } = renderer
export { act, waitFor }
export type { WaitOptions }

export * as ReactThreeTest from './types'
export default { create, act, waitFor }
