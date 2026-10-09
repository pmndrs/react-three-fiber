/**
 * @fileoverview Default entry point - WebGPU
 *
 * This is the entry for apps. `<Canvas>` renders with `WebGPURenderer`, which falls back to a WebGL2
 * backend where the browser has no WebGPU. The renderer support is behind a dynamic import, and
 * nothing in fiber's core imports three statically, so a library that imports hooks from here adds
 * no renderer to an app on another entry.
 *
 * `WebGLRenderer` is only on `@react-three/fiber/legacy`. `@react-three/fiber/webgpu` is the same
 * renderer with its support imported statically (no extra request) and `useThree`/`useFrame`
 * narrowed to WebGPU types.
 *
 * Usage:
 *   import { Canvas, useFrame } from '@react-three/fiber'
 */

import { createRoot as createRootImpl } from './core/root'
import { Canvas as CanvasImpl } from './web/Canvas'
import type * as ReactThreeFiber from '../types/entries/default'
import type { CanvasProps, ReconcilerRoot, RendererProvider, ThreeElementsOf } from '#types'
export type { ReactThreeFiber }
export type * from '../types/three'
export * from './core'
export { createPointerEvents as events } from './core/events'

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
export function Canvas(props: CanvasProps) {
  return <CanvasImpl {...props} provider={provider} />
}

//* Element types ==============================
// This entry can build either renderer's objects, so its JSX map is the union of both namespaces.
// Augment `ThreeElements` here to add custom elements:
//
//   declare module '@react-three/fiber' {
//     interface ThreeElements { customThing: ThreeElement<typeof CustomThing> }
//   }

/** Three.js constructors available as JSX elements on this entry. */
export type ThreeExports = typeof import('three') & typeof import('three/webgpu')

export interface ThreeElements extends ThreeElementsOf<ThreeExports> {}

// react/jsx-runtime and react/jsx-dev-runtime inherit React's IntrinsicElements
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
