import * as ReactThreeFiber from './three-types'
export { ReactThreeFiber }
export * from './three-types'
export * from './core'
export * from './web/Canvas'
export { createPointerEvents as events, createPointerEvents } from './core/events'

// Re-export build flags for consumers to check
export { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU } from '#three'
