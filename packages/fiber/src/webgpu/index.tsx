/**
 * @fileoverview WebGPU entry point - WebGPU only, no legacy WebGL
 *
 * This entry point is for apps that want to use ONLY WebGPURenderer.
 * Includes WebGPU-specific hooks (useUniforms, useNodes, useTextures).
 * Auto-extends THREE with WebGPU node materials (MeshBasicNodeMaterial, etc.)
 *
 * Usage:
 *   import { Canvas, useFrame, useUniforms } from '@react-three/fiber/webgpu'
 */

// NOTE: Use explicit path for Jest compatibility (build overrides via alias)
import * as THREE from '../three/webgpu'
import type * as ReactThreeFiber from '../../types/three'
export type { ReactThreeFiber }
export type * from '../../types/three'
export * from '../core'
export * from '../core/Canvas'
export { createPointerEvents as events } from '../core/events'

// Re-export build flags for consumers to check
export { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU } from '../three/webgpu'

//* Auto-extend THREE with WebGPU node materials ==============================
// This makes MeshBasicNodeMaterial, MeshStandardNodeMaterial, etc. available
// declaratively without users needing to call extend() themselves
import { extend } from '../core/reconciler'
extend(THREE as any)

//* WebGPU-specific exports ==============================
// These hooks are only meaningful with WebGPU/TSL
export * from './hooks'
