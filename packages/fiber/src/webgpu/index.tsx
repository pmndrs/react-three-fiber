/**
 * @fileoverview WebGPU entry point - WebGPU only
 *
 * A thin alias over the same core as `@react-three/fiber`, with the WebGPU renderer support imported
 * statically: no second request for the renderer, no WebGL renderer reachable at all, node
 * materials as JSX elements, and `useThree`/`useFrame`/`Canvas` typed against a `WebGPURenderer`.
 * The `renderer` prop is not needed here.
 *
 * The TSL resource hooks (useUniforms, useNodes, useRenderPipeline, ...) are in @react-three/tsl.
 *
 * Usage:
 *   import { Canvas, useFrame } from '@react-three/fiber/webgpu'
 *   import { useUniforms } from '@react-three/tsl'
 */

import { createRoot as createRootImpl } from '../core/renderer'
import { Canvas as CanvasImpl } from '../core/Canvas'
import { webgpuSupport } from '../support/webgpu'
import type * as ReactThreeFiber from '../../types/entries/webgpu'
import type { ReconcilerRoot, RendererProvider, ThreeElementsOf, RenderTargetOptions } from '#types'
export type { ReactThreeFiber }
export type * from '../../types/three'
export * from '../core'
export { createPointerEvents as events } from '../core/events'

//* Build flags ==============================
// Which renderers this entry can construct. Each root records the one it got in state.isLegacy.
export const R3F_BUILD_LEGACY = false
export const R3F_BUILD_WEBGPU = true

//* Renderer provider ==============================
// WebGPU only, already loaded: a root on this entry never waits for a renderer
const provider: RendererProvider = {
  webgpu: () => webgpuSupport,
}

/** Create a root that always constructs a WebGPURenderer. */
export function createRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
): ReconcilerRoot<TCanvas> {
  return createRootImpl(canvas, provider)
}

//* WebGPU-specific exports ==============================
// Texture registry types and utilities (the TSL resource hooks moved to @react-three/tsl)
export * from './hooks'

//* WebGPU-specific types ==============================
// Re-export WebGPURootState as RootState so useThree() returns WebGPURenderer-typed state
// The base state stays exported under its own name: useStore(), state.get(), previousRoot and
// primaryStore are typed with it, and packages that add fields to RootState (e.g.
// @react-three/tsl) augment it here, so WebGPURootState, which extends it, gets them too.
export type { RootState as BaseRootState } from '../../types/store'
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
import { useRenderTarget as useRenderTargetCore } from '../core/hooks/useRenderTarget'
import type { FrameCallback, UseFrameNextOptions, FrameNextControls } from '@pmndrs/scheduler'
import type { RenderTarget } from 'three/webgpu'
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

/** `useRenderTarget` narrowed to the target this entry's renderer produces. */
export const useRenderTarget = useRenderTargetCore as {
  (options?: RenderTargetOptions): RenderTarget
  (size: number, options?: RenderTargetOptions): RenderTarget
  (width: number, height: number, options?: RenderTargetOptions): RenderTarget
}

//* WebGPU-narrowed Canvas ==============================
// Same reasoning for `onCreated`: it is the one callback that runs early enough to configure the
// renderer before its first frame, and on this entry the renderer it receives is always a
// WebGPURenderer. The base `CanvasProps` types it as the WebGL/WebGPU union, which forced an
// `instanceof` narrow for any WebGPU-only member (`renderer.compute`, `renderer.lighting`, ...).
import type { CanvasProps as CanvasPropsCore } from '../../types/canvas'
import type { JSX } from 'react'

/** Canvas props on the WebGPU entry: `onCreated` receives `WebGPURootState`. */
export type WebGPUCanvasProps = Omit<CanvasPropsCore, 'onCreated'> & {
  /** Callback after the canvas has rendered (but not yet committed); `state.renderer` is a `WebGPURenderer` */
  onCreated?: (state: WebGPURootState) => void
}
export type { WebGPUCanvasProps as CanvasProps }

/**
 * A DOM canvas which accepts threejs elements as children, rendered with WebGPU. `onCreated` is
 * typed against `WebGPURootState`.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export const Canvas = ((props: CanvasPropsCore) => <CanvasImpl {...props} provider={provider} />) as unknown as (
  props: WebGPUCanvasProps,
) => JSX.Element

//* Element types ==============================
// Only the `three/webgpu` namespace: node materials included, no `<webGLRenderer>`. Augment
// `ThreeElements` here to add custom elements to this entry.

/** Three.js constructors available as JSX elements on this entry. */
export type ThreeExports = typeof import('three/webgpu')

export interface ThreeElements extends ThreeElementsOf<ThreeExports> {}

// react/jsx-runtime and react/jsx-dev-runtime inherit React's IntrinsicElements
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
