/**
 * @fileoverview Legacy entry point - WebGL only
 *
 * A thin alias over the same core as `@react-three/fiber`, with the WebGL renderer support imported
 * statically: no second request for the renderer, no WebGPU code reachable at all, and
 * `useThree`/`useFrame`/`Canvas` typed against a `WebGLRenderer`.
 *
 * Usage:
 *   import { Canvas, useFrame } from '@react-three/fiber/legacy'
 */

import { createRoot as createRootImpl } from './core/renderer'
import { Canvas as CanvasImpl } from './core/Canvas'
import { webglSupport } from './support/webgl'
import type * as ReactThreeFiber from '../types/entries/legacy'
import type { ReconcilerRoot, RendererProvider, ThreeElementsOf, RenderTargetOptions } from '#types'
export type { ReactThreeFiber }
export type * from '../types/three'
export * from './core'
export { createPointerEvents as events } from './core/events'

//* Build flags ==============================
// Which renderers this entry can construct. Each root records the one it got in state.isLegacy.
export const R3F_BUILD_LEGACY = true
export const R3F_BUILD_WEBGPU = false

//* Renderer provider ==============================
// WebGL only, already loaded: a root on this entry never waits for a renderer
const provider: RendererProvider = {
  webgl: () => webglSupport,
}

/** Create a root that always constructs a WebGLRenderer. */
export function createRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
): ReconcilerRoot<TCanvas> {
  return createRootImpl(canvas, provider)
}

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
import { useRenderTarget as useRenderTargetCore } from './core/hooks/useRenderTarget'
import type { FrameCallback, UseFrameNextOptions, FrameNextControls } from '@pmndrs/scheduler'
import type { WebGLRenderTarget } from 'three'
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

/** `useRenderTarget` narrowed to the target this entry's renderer produces. */
export const useRenderTarget = useRenderTargetCore as {
  (options?: RenderTargetOptions): WebGLRenderTarget
  (size: number, options?: RenderTargetOptions): WebGLRenderTarget
  (width: number, height: number, options?: RenderTargetOptions): WebGLRenderTarget
}

//* Legacy-narrowed Canvas ==============================
// `onCreated` is the one callback early enough to configure the renderer before its first frame,
// and on this entry the renderer it receives is always a WebGLRenderer.
import type { CanvasProps as CanvasPropsCore } from '../types/canvas'
import type { JSX } from 'react'

/** Canvas props on the legacy entry: `onCreated` receives `LegacyRootState`. */
export type LegacyCanvasProps = Omit<CanvasPropsCore, 'onCreated'> & {
  /** Callback after the canvas has rendered (but not yet committed); `state.renderer` is a `WebGLRenderer` */
  onCreated?: (state: LegacyRootState) => void
}
export type { LegacyCanvasProps as CanvasProps }

/**
 * A DOM canvas which accepts threejs elements as children, rendered with WebGL. `onCreated` is
 * typed against `LegacyRootState`.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export const Canvas = ((props: CanvasPropsCore) => <CanvasImpl {...props} provider={provider} />) as unknown as (
  props: LegacyCanvasProps,
) => JSX.Element

//* Element types ==============================
// Only the `three` namespace: no node materials, no `<webGPURenderer>`. Augment `ThreeElements`
// here to add custom elements to this entry.

/** Three.js constructors available as JSX elements on this entry. */
export type ThreeExports = typeof import('three')

export interface ThreeElements extends ThreeElementsOf<ThreeExports> {}

// react/jsx-runtime and react/jsx-dev-runtime inherit React's IntrinsicElements
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
