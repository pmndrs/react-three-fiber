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

//* WebGPU-specific types ==============================
// Re-export WebGPURootState as RootState so useThree() returns WebGPURenderer-typed state
export type {
  WebGPURootState as RootState,
  WebGPUInternalState as InternalState,
  WebGPUR3FRenderer as R3FRenderer,
  WebGPUProps,
  WebGPUDefaultProps,
  WebGPUShadowConfig,
} from '../../types/webgpu'

//* WebGPU-narrowed state hooks ==============================
// `export * from '../core'` above brings in useThree/useFrame declared against the *base*
// RootState, whose `renderer` is the R3FRenderer union (WebGLRenderer included). On this entry
// that union is already resolved — the caller has committed to WebGPU — so leaving it in place
// forced a cast for anything WebGPU-only:
//
//   const renderer = useThree((s) => s.renderer)
//   renderer.compute(node)   // Property 'compute' does not exist on type 'R3FRenderer'
//
// which is exactly the friction the split entry points exist to remove. These explicit exports
// shadow the star re-exports (ESM and TS both give a local export precedence) and re-declare the
// two hooks against WebGPURootState. Types only: the values are the core implementations
// untouched, so there is no runtime cost and no second code path to keep in sync.
// See https://github.com/pmndrs/react-three-fiber/issues/3851
import { useThree as useThreeCore, useFrame as useFrameCore } from '../core'
import type { FrameCallback, UseFrameNextOptions, FrameNextControls } from '@pmndrs/scheduler'
import type { WebGPURootState } from '../../types/webgpu'

/** `useThree` narrowed to WebGPU state — `state.renderer` is a `WebGPURenderer`. */
export type UseThreeWebGPU = <T = WebGPURootState>(
  selector?: (state: WebGPURootState) => T,
  equalityFn?: <U>(state: U, newState: U) => boolean,
) => T

/** `useFrame` narrowed to WebGPU state — the callback's `state.renderer` is a `WebGPURenderer`. */
export type UseFrameWebGPU = (
  callback?: FrameCallback<WebGPURootState>,
  priorityOrOptions?: number | UseFrameNextOptions,
) => FrameNextControls

// The two signatures are structurally incompatible (the selector parameter makes them
// contravariant), so the re-type has to go through `unknown`. It is sound: WebGPURootState is
// the same object the base hook already returns, only with renderer/gl/internal narrowed to what
// this entry guarantees at runtime.
export const useThree = useThreeCore as unknown as UseThreeWebGPU
export const useFrame = useFrameCore as unknown as UseFrameWebGPU
