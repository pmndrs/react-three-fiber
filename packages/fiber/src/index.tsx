/** Default entry with WebGL and WebGPU support. */

import * as THREE from './three/index'
import { WebGLRenderer, WebGLCubeRenderTarget } from 'three'
import {
  WebGPURenderer,
  CanvasTarget,
  CubeRenderTarget,
  Node,
  NodeUpdateType,
  MeshBasicNodeMaterial,
} from 'three/webgpu'
import { uniform, nodeObject } from 'three/tsl'
import { createRoot as createRootImpl } from './core/renderer'
import { Canvas as CanvasImpl } from './core/Canvas'
import type * as ReactThreeFiber from '../types/entries/default'
import type { CanvasProps, ReconcilerRoot, RendererProvider, RootCanvas, ThreeElementsOf } from '#types'
export type { ReactThreeFiber }
export type * from '../types/three'
export * from './core'
export { createPointerEvents as events } from './core/events'

//* Build flags ==============================
// Available renderers. Each root records its active renderer in state.isLegacy.
export const R3F_BUILD_LEGACY = true
export const R3F_BUILD_WEBGPU = true

//* Renderer provider ==============================
// Renderer dependencies are reachable through Canvas and createRoot so hook imports can tree-shake them.
const provider: RendererProvider = {
  namespace: THREE,
  webgl: {
    kind: 'webgl',
    Renderer: WebGLRenderer,
    CubeRenderTarget: WebGLCubeRenderTarget,
    loadGainMapLoader: async () => (await import('@monogrid/gainmap-js')).GainMapLoader,
  },
  webgpu: {
    kind: 'webgpu',
    Renderer: WebGPURenderer,
    CanvasTarget,
    CubeRenderTarget,
    occlusion: { Node, NodeUpdateType, MeshBasicNodeMaterial, uniform, nodeObject },
  },
}

/** Create a root using WebGL by default or WebGPU when the renderer prop is provided. */
export function createRoot<TCanvas extends RootCanvas>(canvas: TCanvas): ReconcilerRoot<TCanvas> {
  return createRootImpl(canvas, provider)
}

/**
 * A DOM canvas which accepts threejs elements as children.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export function Canvas(props: CanvasProps) {
  return <CanvasImpl {...props} provider={provider} />
}

//* Element types ==============================
// Augment this entry's ThreeElements interface to add custom JSX elements.

/** Three.js constructors available as JSX elements on this entry. */
export type ThreeExports = typeof import('three') & typeof import('three/webgpu')

export interface ThreeElements extends ThreeElementsOf<ThreeExports> {}

// Both JSX runtimes inherit React's intrinsic elements.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
