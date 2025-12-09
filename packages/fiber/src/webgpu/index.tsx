/**
 * @fileoverview WebGPU entry point - WebGPU only, no legacy WebGL
 *
 * This entry point is for apps that want to use ONLY WebGPURenderer.
 * Includes WebGPU-specific hooks (useUniform, useNodes, useTextures).
 *
 * Usage:
 *   import { Canvas, useFrame, useUniform } from '@react-three/fiber/webgpu'
 */

import * as ReactThreeFiber from '../three-types'
export { ReactThreeFiber }
export * from '../three-types'
export * from '../core'
export * from '../web/Canvas'
export { createPointerEvents as events } from '../web/events'

// Re-export build flags for consumers to check
export { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU } from '#three'

//* WebGPU-specific exports ==============================
// These hooks are only meaningful with WebGPU/TSL
export * from './hooks'
export * from './store'
