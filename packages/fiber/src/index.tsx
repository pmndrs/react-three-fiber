/**
 * @fileoverview Default entry point - WebGPU renderer with WebGL fallback
 *
 * This is the standard entry point for most users. It supports both WebGPU
 * and WebGL (legacy) renderers. THREE namespace is auto-extended with all
 * constructors including node materials.
 *
 * Usage:
 *   import { Canvas, useFrame } from '@react-three/fiber'
 */

import * as THREE from '#three'
import type * as ReactThreeFiber from '../types/entries/default'
import type { ThreeElementsOf } from '#types'
export type { ReactThreeFiber }
export type * from '../types/three'
export * from './core'
export * from './core/Canvas'
export { createPointerEvents as events } from './core/events'

// Re-export build flags for consumers to check
export { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU } from '#three'

//* Auto-extend THREE namespace ==============================
// This makes all THREE constructors (including node materials) available
// declaratively without users needing to call extend() themselves
import { extend } from './core/extend'
extend(THREE)

//* Element types ==============================
// Augment this entry's ThreeElements interface to add custom JSX elements.

/** Three.js constructors available as JSX elements on this entry. */
export type ThreeExports = typeof import('three') & typeof import('three/webgpu')

export interface ThreeElements extends ThreeElementsOf<ThreeExports> {}

// Both JSX runtimes inherit React's intrinsic elements.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
