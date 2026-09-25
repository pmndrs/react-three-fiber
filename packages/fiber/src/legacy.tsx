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
import type * as ReactThreeFiber from '../types/three'
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
import { extend } from './core/reconciler'
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

//* Legacy-narrowed state hooks ==============================
// `export * from './core'` above brings in useThree/useFrame declared against the *base*
// RootState, whose `renderer` is the R3FRenderer union (WebGPURenderer included). This entry only
// ever creates a WebGLRenderer, and it exports `LegacyRootState as RootState` -- so without these
// re-declarations the hooks handed back a different state type than the one the entry names.
// Same approach as src/webgpu/index.tsx: explicit exports shadow the star re-exports, types only,
// so the values are the core implementations untouched.
import { useThree as useThreeCore, useFrame as useFrameCore } from './core'
import type { FrameCallback, UseFrameNextOptions, FrameNextControls } from '@pmndrs/scheduler'
import type { LegacyRootState } from '../types/webgl'

/** `useThree` narrowed to legacy state — `state.renderer` is a `WebGLRenderer`. */
export type UseThreeLegacy = <T = LegacyRootState>(
  selector?: (state: LegacyRootState) => T,
  equalityFn?: <U>(state: U, newState: U) => boolean,
) => T

/** `useFrame` narrowed to legacy state — the callback's `state.renderer` is a `WebGLRenderer`. */
export type UseFrameLegacy = (
  callback?: FrameCallback<LegacyRootState>,
  priorityOrOptions?: number | UseFrameNextOptions,
) => FrameNextControls

// The selector parameter makes the signatures contravariant, so the re-type goes through
// `unknown`. It is sound: LegacyRootState is the same object the base hook returns, with
// renderer/internal narrowed to what this entry guarantees at runtime.
export const useThree = useThreeCore as unknown as UseThreeLegacy
export const useFrame = useFrameCore as unknown as UseFrameLegacy

//* Legacy-narrowed Canvas ==============================
// `onCreated` is the one callback early enough to configure the renderer before its first frame,
// and on this entry the renderer it receives is always a WebGLRenderer.
import { Canvas as CanvasCore } from './core/Canvas'
import type { CanvasProps as CanvasPropsCore } from '../types/canvas'
import type { JSX } from 'react'

/** Canvas props on the legacy entry: `onCreated` receives `LegacyRootState`. */
export type LegacyCanvasProps = Omit<CanvasPropsCore, 'onCreated'> & {
  /** Callback after the canvas has rendered (but not yet committed); `state.renderer` is a `WebGLRenderer` */
  onCreated?: (state: LegacyRootState) => void
}
export type { LegacyCanvasProps as CanvasProps }

/** `Canvas` narrowed to legacy state — the same component, `onCreated` typed against `LegacyRootState`. */
export const Canvas = CanvasCore as unknown as (props: LegacyCanvasProps) => JSX.Element
