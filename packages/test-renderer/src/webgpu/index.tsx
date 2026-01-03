/**
 * @fileoverview WebGPU Entry Point - Full WebGPU Support with Hooks
 *
 * Use this entry point when testing applications that use:
 *   import { Canvas, useUniforms, useNodes } from '@react-three/fiber/webgpu'
 *
 * This entry provides:
 * - WebGPU context mocking for Node.js tests
 * - All WebGPU-specific hooks for testing TSL uniforms and nodes
 * - Automatic THREE extension with node materials
 *
 * Usage:
 *   import ReactThreeTestRenderer, { useUniform, useNodes } from '@react-three/test-renderer/webgpu'
 */

import * as THREE from 'three/webgpu'
import { extend, _roots as mockRoots, createRoot, reconciler, act } from '@react-three/fiber/webgpu'

// Import WebGPU hooks directly from fiber source for Jest compatibility
import { useUniform, type UniformValue } from '../../../fiber/src/webgpu/hooks/useUniform'
import {
  useUniforms,
  removeUniforms,
  clearScope,
  clearRootUniforms,
  type UniformCreator,
} from '../../../fiber/src/webgpu/hooks/useUniforms'
import {
  useNodes,
  useLocalNodes,
  removeNodes,
  clearNodeScope,
  clearRootNodes,
  type TSLNode,
  type NodeRecord,
  type NodeCreator,
  type LocalNodeCreator,
} from '../../../fiber/src/webgpu/hooks/useNodes'
import {
  useTextures,
  type TextureEntry,
  type TextureNode,
  type UseTexturesReturn,
} from '../../../fiber/src/webgpu/hooks/useTextures'

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

// WebGPU-specific hooks (re-exported from fiber/webgpu)
export {
  // Uniforms
  useUniform,
  useUniforms,
  removeUniforms,
  clearScope,
  clearRootUniforms,
  // Nodes
  useNodes,
  useLocalNodes,
  removeNodes,
  clearNodeScope,
  clearRootNodes,
  // Textures
  useTextures,
}

// WebGPU-specific types
export type {
  UniformCreator,
  UniformValue,
  TSLNode,
  NodeRecord,
  NodeCreator,
  LocalNodeCreator,
  TextureEntry,
  TextureNode,
  UseTexturesReturn,
}

// Mock utilities (for advanced use cases)
export { mockWebGPU, unmockWebGPU }

// Re-export types namespace
export * as ReactThreeTest from '../types'

// Default export
export default { create, act, waitFor }
