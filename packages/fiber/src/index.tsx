import * as ReactThreeFiber from '../types/three'
export { ReactThreeFiber }
export * from '../types/three'
export * from './core'
export * from './core/Canvas'
export { createPointerEvents as events, createPointerEvents } from './core/events'

// Re-export build flags for consumers to check
export { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU } from '#three'
