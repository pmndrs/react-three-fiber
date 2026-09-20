import type { WebGLRenderer, WebGLCubeRenderTarget } from 'three'
import type {
  WebGPURenderer,
  CanvasTarget,
  CubeRenderTarget,
  Node,
  NodeUpdateType,
  MeshBasicNodeMaterial,
} from 'three/webgpu'
import type { uniform, nodeObject } from 'three/tsl'
import type { LoaderLike } from './loader'

// Entry providers supply renderer dependencies to shared core through Canvas and createRoot.

/** WebGL support supplied by the root and legacy entries. */
export interface WebGLSupport {
  kind: 'webgl'
  Renderer: typeof WebGLRenderer
  /** Cube render target for `<Environment>`. */
  CubeRenderTarget: typeof WebGLCubeRenderTarget
  /** Load the WebGL gain map decoder on demand for .webp environments. */
  loadGainMapLoader: () => Promise<GainMapLoaderClass>
}

/** WebGPU support supplied by the root and WebGPU entries. */
export interface WebGPUSupport {
  kind: 'webgpu'
  Renderer: typeof WebGPURenderer
  /** Canvas target for secondary canvases sharing a primary's renderer. */
  CanvasTarget: typeof CanvasTarget
  /** Cube render target for `<Environment>`. */
  CubeRenderTarget: typeof CubeRenderTarget
  /** Node classes and TSL functions the occlusion observer is built from. */
  occlusion: OcclusionSupport
}

/** Support for the active renderer. */
export type RendererSupport = WebGLSupport | WebGPUSupport

export interface OcclusionSupport {
  Node: typeof Node
  NodeUpdateType: typeof NodeUpdateType
  MeshBasicNodeMaterial: typeof MeshBasicNodeMaterial
  uniform: typeof uniform
  nodeObject: typeof nodeObject
}

/** Renderer support and JSX constructors supplied by an entry point. */
export interface RendererProvider {
  /** JSX constructors for this entry, used after explicit extend() registrations. */
  namespace: Record<string, unknown>
  webgl?: WebGLSupport
  webgpu?: WebGPUSupport
}

/** Structural loader type that avoids exposing the decoder package declarations to consumers. */
export type GainMapLoaderClass = new (...args: any[]) => LoaderLike
