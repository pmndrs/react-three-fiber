/**
 * @fileoverview WebGPU entry point - WebGPU only. Deprecated: removed in the first v10 beta.
 *
 * `@react-three/fiber` renders with WebGPU too, so this entry is now the same renderer with its
 * support imported statically and the types narrowed. Import from `@react-three/fiber` instead, and
 * declare `interface Register { renderer: 'webgpu' }` for the narrowed types. It stays for the v10
 * alphas so existing imports keep working.
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

import { createRoot as createRootImpl } from '../core/root'
import { Canvas as CanvasImpl } from '../web/Canvas'
import { webgpuSupport } from '../support/webgpu'
import { asWebGPUCanvas } from './narrowed'
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

/**
 * Create a root that always constructs a WebGPURenderer.
 * @deprecated `@react-three/fiber/webgpu` is removed in the first v10 beta. Import `createRoot` from
 * `@react-three/fiber`, which renders with WebGPU and has the same types.
 */
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

//* WebGPU-narrowed hooks and Canvas ==============================
// Shared with the root entry, which also renders with WebGPU (see ./narrowed). The explicit exports
// shadow the core hooks' star re-exports above.
export { useThree, useFrame, useRenderTarget } from './narrowed'
export type { UseThreeWebGPU, UseFrameWebGPU, WebGPUCanvasProps, WebGPUCanvasProps as CanvasProps } from './narrowed'

/**
 * A DOM canvas which accepts threejs elements as children, rendered with WebGPU. `onCreated` is
 * typed against `WebGPURootState`.
 * @deprecated `@react-three/fiber/webgpu` is removed in the first v10 beta. Import `Canvas` from
 * `@react-three/fiber`, which renders with WebGPU and has the same types.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export const Canvas = asWebGPUCanvas((props) => <CanvasImpl {...props} provider={provider} />)

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
