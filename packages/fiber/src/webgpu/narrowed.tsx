/**
 * @fileoverview WebGPU-narrowed hook and Canvas types, shared by the entries that render with WebGPU
 *
 * `@react-three/fiber` and `@react-three/fiber/webgpu` both render with WebGPURenderer. The core
 * hooks are declared against the base RootState, whose `renderer` is the R3FRenderer union
 * (WebGLRenderer included) so that libraries typed against it also compile for `/legacy` apps. On
 * these entries that union is already resolved, so leaving it in place forced a cast for anything
 * WebGPU-only:
 *
 *   const renderer = useThree((s) => s.renderer)
 *   renderer.compute(node)   // Property 'compute' does not exist on type 'R3FRenderer'
 *
 * The entries re-export the hooks below instead. Types only: the values are the core
 * implementations untouched, so there is no runtime cost and no second code path to keep in sync.
 * See https://github.com/pmndrs/react-three-fiber/issues/3851
 */

import { useThree as useThreeCore, useFrame as useFrameCore } from '../core'
import { useRenderTarget as useRenderTargetCore } from '../core/hooks/useRenderTarget'
import type { FrameCallback, UseFrameNextOptions, FrameNextControls } from '@pmndrs/scheduler'
import type { RenderTarget } from 'three/webgpu'
import type { JSX } from 'react'
import type { RenderTargetOptions } from '#types'
import type { CanvasProps as CanvasPropsCore } from '../../types/canvas'
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
// these entries guarantee at runtime.
export const useThree = useThreeCore as unknown as UseThreeWebGPU
export const useFrame = useFrameCore as unknown as UseFrameWebGPU

/** `useRenderTarget` narrowed to the target a WebGPU renderer produces. */
export const useRenderTarget = useRenderTargetCore as {
  (options?: RenderTargetOptions): RenderTarget
  (size: number, options?: RenderTargetOptions): RenderTarget
  (width: number, height: number, options?: RenderTargetOptions): RenderTarget
}

/** Canvas props on a WebGPU entry: `onCreated` receives `WebGPURootState`. */
export type WebGPUCanvasProps = Omit<CanvasPropsCore, 'onCreated'> & {
  /** Callback after the canvas has rendered (but not yet committed); `state.renderer` is a `WebGPURenderer` */
  onCreated?: (state: WebGPURootState) => void
}

/**
 * Types an entry's Canvas against {@link WebGPUCanvasProps}. `onCreated` is the one callback that
 * runs early enough to configure the renderer before its first frame, and on these entries the
 * renderer it receives is always a WebGPURenderer.
 */
export const asWebGPUCanvas = (Canvas: (props: CanvasPropsCore) => JSX.Element) =>
  Canvas as unknown as (props: WebGPUCanvasProps) => JSX.Element
