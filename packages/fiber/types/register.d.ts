import type { WebGLRenderer, WebGLRenderTarget } from 'three'
import type { WebGPURenderer, RenderTarget } from 'three/webgpu'
import type { RendererSupport, WebGLSupport, WebGPUSupport } from './provider'

//* Register ==============================
// The root entry can construct either renderer, so by default `state.renderer` is the union of
// both and a WebGPU-only member (`renderer.compute`, `renderer.backend`) needs a narrow. An app that
// has decided on one renderer says so once, and every renderer-typed field follows -- `useThree`,
// `useFrame`, `onCreated`, `useRenderTarget`, `state.internal.support`:
//
//   declare module '@react-three/fiber' {
//     interface Register {
//       renderer: 'webgpu'
//     }
//   }
//
// Same pattern as `Register` in @react-three/tsl (and TanStack Router). Nothing registered means
// the union, unchanged. The `/legacy` and `/webgpu` entries are the same thing decided by import
// path; this is for apps on `@react-three/fiber` that want the narrowed types without changing it.

/**
 * Augment this to type `RootState` for the renderer your app uses. Recognised keys:
 * - `renderer`: `'webgpu'` or `'webgl'`
 */
export interface Register {}

/** The registered renderer, or `'any'` when nothing is registered. */
export type RegisteredRenderer = Register extends { renderer: infer R extends 'webgl' | 'webgpu' } ? R : 'any'

/** Pick the type for the registered renderer: WebGPU, WebGL, or both when nothing is registered. */
export type ForRegisteredRenderer<WebGPU, WebGL, Either = WebGPU | WebGL> = RegisteredRenderer extends 'webgpu'
  ? WebGPU
  : RegisteredRenderer extends 'webgl'
    ? WebGL
    : Either

/** The renderer type of `state.renderer`: a union of both unless one is registered. */
export type R3FRenderer = ForRegisteredRenderer<WebGPURenderer, WebGLRenderer>

/** What `useRenderTarget` returns: a union of both target classes unless a renderer is registered. */
export type R3FRenderTarget = ForRegisteredRenderer<RenderTarget, WebGLRenderTarget>

/** The renderer support on `state.internal.support`, narrowed to the registered renderer. */
export type R3FRendererSupport = ForRegisteredRenderer<WebGPUSupport, WebGLSupport, RendererSupport>
