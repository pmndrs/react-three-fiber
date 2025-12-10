/**
 * @fileoverview Legacy entry point - WebGL only
 *
 * This entry point is for apps that want to use the legacy WebGLRenderer.
 * No WebGPU features are available from this import path.
 *
 * Usage:
 *   import { Canvas, useFrame } from '@react-three/fiber/legacy'
 */

import * as ReactThreeFiber from './three-types'
export { ReactThreeFiber }
export * from './three-types'
export * from './core'
export * from './core/Canvas'
export { createPointerEvents as events } from './core/events'

// Re-export build flags for consumers to check
export { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU } from '#three'
