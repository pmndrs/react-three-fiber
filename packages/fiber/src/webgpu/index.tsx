/** WebGPU entry with shared core APIs and TSL hooks. */

import * as THREE from 'three/webgpu'
import {
  WebGPURenderer,
  CanvasTarget,
  CubeRenderTarget,
  Node,
  NodeUpdateType,
  MeshBasicNodeMaterial,
} from 'three/webgpu'
import { uniform, nodeObject } from 'three/tsl'
import { createRoot as createRootImpl } from '../core/renderer'
import { Canvas as CanvasImpl } from '../core/Canvas'
import type * as ReactThreeFiber from '../../types/entries/webgpu'
import type { CanvasProps, ReconcilerRoot, RendererProvider, RootCanvas, ThreeElementsOf } from '#types'
export type { ReactThreeFiber }
export type * from '../../types/three'
export * from '../core'
export { createPointerEvents as events } from '../core/events'

//* Build flags ==============================
// Available renderers. Each root records its active renderer in state.isLegacy.
export const R3F_BUILD_LEGACY = false
export const R3F_BUILD_WEBGPU = true

//* Renderer provider ==============================
// WebGPU dependencies are reachable through Canvas and createRoot.
const provider: RendererProvider = {
  namespace: THREE,
  webgpu: {
    kind: 'webgpu',
    Renderer: WebGPURenderer,
    CanvasTarget,
    CubeRenderTarget,
    occlusion: { Node, NodeUpdateType, MeshBasicNodeMaterial, uniform, nodeObject },
  },
}

/** Create a root that always constructs a WebGPURenderer. */
export function createRoot<TCanvas extends RootCanvas>(canvas: TCanvas): ReconcilerRoot<TCanvas> {
  return createRootImpl(canvas, provider)
}

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
// Shared hooks with WebGPU state types.
import { useThree as useThreeCore, useFrame as useFrameCore } from '../core'
import type { FrameCallback, UseFrameNextOptions, FrameNextControls } from '@pmndrs/scheduler'
import type { WebGPURootState } from '../../types/webgpu'

/** Select state with a WebGPURenderer. */
export type UseThreeWebGPU = <T = WebGPURootState>(
  selector?: (state: WebGPURootState) => T,
  equalityFn?: <U>(state: U, newState: U) => boolean,
) => T

/** Frame callback with WebGPU state. */
export type UseFrameWebGPU = (
  callback?: FrameCallback<WebGPURootState>,
  priorityOrOptions?: number | UseFrameNextOptions,
) => FrameNextControls

// The intermediate cast permits narrowing callback and selector parameters to WebGPU state.
export const useThree = useThreeCore as unknown as UseThreeWebGPU
export const useFrame = useFrameCore as unknown as UseFrameWebGPU

//* WebGPU-narrowed Canvas ==============================
// Canvas callbacks receive WebGPU state.
import type { JSX } from 'react'

/** Canvas props on the WebGPU entry: `onCreated` receives `WebGPURootState`. */
export type WebGPUCanvasProps = Omit<CanvasProps, 'onCreated'> & {
  /** Callback with WebGPU state during canvas initialization. */
  onCreated?: (state: WebGPURootState) => void
}
export type { WebGPUCanvasProps as CanvasProps }

function CanvasEntry(props: CanvasProps) {
  return <CanvasImpl {...props} provider={provider} />
}

/**
 * A DOM canvas for Three.js elements rendered with WebGPU.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export const Canvas = CanvasEntry as unknown as (props: WebGPUCanvasProps) => JSX.Element

//* Element types ==============================
// Augment this entry's ThreeElements interface to add custom JSX elements.

/** Three.js constructors available as JSX elements on this entry. */
export type ThreeExports = typeof import('three/webgpu')

export interface ThreeElements extends ThreeElementsOf<ThreeExports> {}

// Both JSX runtimes inherit React's intrinsic elements.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
