/**
 * @fileoverview Default entry point - one import, either renderer
 *
 * This is the entry for apps. A plain `<Canvas>` renders with WebGL; `<Canvas renderer>` renders
 * with WebGPU. Only the renderer a Canvas asks for is downloaded: both are behind dynamic imports
 * here, and nothing in fiber's core imports three statically. A WebGPU app on this entry ships the
 * same three code as one on `@react-three/fiber/webgpu`, one request later.
 *
 * `@react-three/fiber/legacy` and `@react-three/fiber/webgpu` remain for apps that would rather
 * not have that request, or want `useThree`/`useFrame` narrowed to one renderer's types.
 *
 * Usage:
 *   import { Canvas, useFrame } from '@react-three/fiber'
 */

import { createRoot as createRootImpl } from './core/renderer'
import { Canvas as CanvasImpl } from './core/Canvas'
import type * as ReactThreeFiber from '../types/entries/default'
import type { CanvasProps, ReconcilerRoot, RendererProvider, ThreeElementsOf } from '#types'
export type { ReactThreeFiber }
export type * from '../types/three'
export * from './core'
export { createPointerEvents as events } from './core/events'

//* Build flags ==============================
// Which renderers this entry can construct. Each root records the one it got in state.isLegacy.
export const R3F_BUILD_LEGACY = true
export const R3F_BUILD_WEBGPU = true

//* Renderer provider ==============================
// Both renderers, each loaded when a root first asks for it. Bundlers emit the two support modules
// as separate chunks; which one an app downloads is decided by its Canvas props at runtime.
const provider: RendererProvider = {
  webgl: () => import('./support/webgl').then((m) => m.webglSupport),
  webgpu: () => import('./support/webgpu').then((m) => m.webgpuSupport),
}

/**
 * Create a root on a canvas. Renders with WebGL unless `configure({ renderer })` asks for WebGPU.
 */
export function createRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
): ReconcilerRoot<TCanvas> {
  return createRootImpl(canvas, provider)
}

/**
 * A DOM canvas which accepts threejs elements as children. Renders with WebGL by default and with
 * WebGPU when given the `renderer` prop.
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
