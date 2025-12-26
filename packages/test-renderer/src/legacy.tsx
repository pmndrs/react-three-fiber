/**
 * @fileoverview Legacy Entry Point - WebGL Renderer
 *
 * Use this entry point when testing applications that use:
 *   import { Canvas } from '@react-three/fiber/legacy'
 *
 * This entry uses WebGLRenderer only, no WebGPU support.
 *
 * Usage:
 *   import ReactThreeTestRenderer from '@react-three/test-renderer/legacy'
 */

import * as THREE from 'three'
import { extend, _roots as mockRoots, createRoot, reconciler, act } from '@react-three/fiber/legacy'

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
  mode: 'webgl',
})

//* Exports ==============================

export const { create } = renderer
export { act, waitFor }
export type { WaitOptions }

export * as ReactThreeTest from './types'
export default { create, act, waitFor }
