/**
 * Core utilities for react-three-fiber
 *
 * This module re-exports utilities organized by domain:
 * - React hooks and components
 * - Instance and scene graph management
 * - Property resolution and application
 * - Three.js-specific utilities
 * - Type checking utilities
 * - Prop markers (fromRef, once)
 */

export { useIsomorphicLayoutEffect, useMutableCallback, useBridge, Block, ErrorBoundary } from './react'
export * from './instance'
export * from './props'
export { calculateDpr, getUuidPrefix, updateCamera, updateFrustum } from './three'
export * from './is'
export * from './fromRef'
export * from './once'
