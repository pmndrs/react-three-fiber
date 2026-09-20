/**
 * @fileoverview Legacy entry point - WebGL only
 *
 * This entry point is for apps that want to use the legacy WebGLRenderer.
 * No WebGPU features are available from this import path.
 * Auto-extends THREE with WebGL-only constructors (no node materials).
 *
 * Usage:
 *   import { Canvas, useFrame } from '@react-three/fiber/legacy'
 */

// NOTE: Use explicit path for Jest compatibility (build overrides via alias)
import * as THREE from './three/legacy'
import type * as ReactThreeFiber from '../types/entries/legacy'
import type { ThreeElementsOf } from '#types'
export type { ReactThreeFiber }
export type * from '../types/three'
export * from './core'
export * from './core/Canvas'
export { createPointerEvents as events } from './core/events'

// Re-export build flags for consumers to check
export { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU } from './three/legacy'

//* Auto-extend THREE namespace ==============================
// This makes all WebGL THREE constructors available declaratively
// Note: No node materials in legacy - those require WebGPU entry
import { extend } from './core/extend'
extend(THREE)

//* Legacy-specific types ==============================
// Re-export LegacyRootState as RootState so useThree() returns WebGLRenderer-typed state
export type {
  LegacyRootState as RootState,
  LegacyInternalState as InternalState,
  LegacyRenderer as R3FRenderer,
  WebGLProps,
  WebGLDefaultProps,
  WebGLShadowConfig,
} from '../types/webgl'

//* Element types ==============================
// Augment this entry's ThreeElements interface to add custom JSX elements.

/** Three.js constructors available as JSX elements on this entry. */
export type ThreeExports = typeof import('three')

export interface ThreeElements extends ThreeElementsOf<ThreeExports> {}

// Both JSX runtimes inherit React's intrinsic elements.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
