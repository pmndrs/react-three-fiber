/**
 * @fileoverview Default entry point - WebGPU
 *
 * This is the entry for apps. `<Canvas>` renders with `WebGPURenderer`, which falls back to a WebGL2
 * backend where the browser has no WebGPU. The renderer support is behind a dynamic import, and
 * nothing in fiber's core imports three statically, so a library that imports hooks from here adds
 * no renderer to an app on another entry.
 *
 * `useThree`, `useFrame`, `useRenderTarget` and `Canvas`'s `onCreated` are typed against
 * `WebGPURenderer`. `RootState` stays the base state (the renderer union), which packages augment and
 * libraries that also run on `/legacy` type against.
 *
 * `WebGLRenderer` is only on `@react-three/fiber/legacy`. `@react-three/fiber/webgpu` is deprecated:
 * it is this entry with the renderer support imported statically.
 *
 * Usage:
 *   import { Canvas, useFrame } from '@react-three/fiber'
 */

import { createRoot as createRootImpl } from './core/root'
import { Canvas as CanvasImpl } from './web/Canvas'
import type * as ReactThreeFiber from '../types/entries/default'
import type { ReconcilerRoot, RendererProvider, ThreeElementsOf } from '#types'
import { asWebGPUCanvas } from './webgpu/narrowed'
export type { ReactThreeFiber }
export type * from '../types/three'
export * from './core'
export { createPointerEvents as events } from './core/events'

//* WebGPU-narrowed hooks and types ==============================
// This entry renders with WebGPU, so these shadow the core hooks' star re-exports with WebGPU-typed
// versions (types only; see ./webgpu/narrowed). `RootState` is deliberately not re-pointed: it stays
// the base interface, so `declare module '@react-three/fiber' { interface RootState {...} }` keeps
// working, and WebGPURootState, which extends it, picks those fields up.
export { useThree, useFrame, useRenderTarget } from './webgpu/narrowed'
export type { UseThreeWebGPU, UseFrameWebGPU, WebGPUCanvasProps as CanvasProps } from './webgpu/narrowed'
export type {
  WebGPURootState,
  WebGPUInternalState,
  WebGPUR3FRenderer,
  WebGPUProps,
  WebGPUDefaultProps,
  WebGPUShadowConfig,
} from '../types/webgpu'

//* Build flags ==============================
// Which renderers this entry can construct. Each root records the one it got in state.isLegacy.
export const R3F_BUILD_LEGACY = false
export const R3F_BUILD_WEBGPU = true

//* Renderer provider ==============================
// WebGPU, loaded when a root first asks for it. WebGLRenderer lives on @react-three/fiber/legacy.
const provider: RendererProvider = {
  webgpu: () => import('./support/webgpu').then((m) => m.webgpuSupport),
}

/**
 * Create a root on a canvas. Renders with `WebGPURenderer`; for `WebGLRenderer`, import `createRoot`
 * from `@react-three/fiber/legacy`.
 */
export function createRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
): ReconcilerRoot<TCanvas> {
  return createRootImpl(canvas, provider)
}

/**
 * A DOM canvas which accepts threejs elements as children. Renders with `WebGPURenderer`; for
 * `WebGLRenderer`, import `Canvas` from `@react-three/fiber/legacy`.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export const Canvas = asWebGPUCanvas((props) => <CanvasImpl {...props} provider={provider} />)

//* Element types ==============================
// The `three/webgpu` namespace: node materials included, no `<webGLRenderer>`. Augment `ThreeElements`
// here to add custom elements:
//
//   declare module '@react-three/fiber' {
//     interface ThreeElements { customThing: ThreeElement<typeof CustomThing> }
//   }

/** Three.js constructors available as JSX elements on this entry. */
export type ThreeExports = typeof import('three/webgpu')

export interface ThreeElements extends ThreeElementsOf<ThreeExports> {}

// react/jsx-runtime and react/jsx-dev-runtime inherit React's IntrinsicElements
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
