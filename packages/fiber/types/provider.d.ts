import type * as ThreeLegacy from 'three'
import type * as ThreeWebGPU from 'three/webgpu'
import type { uniform, nodeObject } from 'three/tsl'

//* Renderer Support ==============================
// Core has no static imports from `three` or `three/webgpu`. Both are separate bundles built on one
// shared `three.core.js`, and there is no import that gives you the core alone -- so a core that
// statically imported either one would put that renderer into every app's eager graph. Instead each
// renderer is described by a *support* object, loaded when a root needs it, that carries the three
// namespace of its flavour plus the handful of renderer-specific classes core touches by name.

/** The Three.js namespace of either flavour. Classes in three's shared core are the same objects in both. */
export type ThreeNamespace = typeof ThreeLegacy | typeof ThreeWebGPU

/**
 * Three's shared core: every export `three` and `three/webgpu` have in common (`Vector3`, `Scene`,
 * `Mesh`, the constants, ...). This is what core code reads from `getThree()`. The renderer-specific
 * exports are reached through the flavour's support object, never by name from here.
 */
export type ThreeCore = Pick<typeof ThreeLegacy, Extract<keyof typeof ThreeLegacy, keyof typeof ThreeWebGPU>>

/** Node classes and TSL functions the occlusion observer is built from (WebGPU only). */
export interface OcclusionSupport {
  Node: typeof ThreeWebGPU.Node
  NodeUpdateType: typeof ThreeWebGPU.NodeUpdateType
  MeshBasicNodeMaterial: typeof ThreeWebGPU.MeshBasicNodeMaterial
  uniform: typeof uniform
  nodeObject: typeof nodeObject
}

/** WebGL renderer support: the `three` namespace and the classes only it exports. */
export interface WebGLSupport {
  kind: 'webgl'
  /** `import * as THREE from 'three'`: JSX constructors for roots on this renderer, and core's classes. */
  three: typeof ThreeLegacy
  Renderer: typeof ThreeLegacy.WebGLRenderer
  /** Render target for `useRenderTarget`. */
  RenderTarget: typeof ThreeLegacy.WebGLRenderTarget
  /** Cube render target for `<Environment>`. */
  CubeRenderTarget: typeof ThreeLegacy.WebGLCubeRenderTarget
}

/** WebGPU renderer support: the `three/webgpu` namespace and the classes only it exports. */
export interface WebGPUSupport {
  kind: 'webgpu'
  /** `import * as THREE from 'three/webgpu'`: JSX constructors (node materials included) and core's classes. */
  three: typeof ThreeWebGPU
  Renderer: typeof ThreeWebGPU.WebGPURenderer
  /** Render target for `useRenderTarget`. */
  RenderTarget: typeof ThreeWebGPU.RenderTarget
  /** Cube render target for `<Environment>`. */
  CubeRenderTarget: typeof ThreeWebGPU.CubeRenderTarget
  /** Canvas target for secondary canvases sharing a primary's renderer. */
  CanvasTarget: typeof ThreeWebGPU.CanvasTarget
  occlusion: OcclusionSupport
}

/** Support for the renderer a root ended up with. Selected by `configure()`, kept on `state.internal.support`. */
export type RendererSupport = WebGLSupport | WebGPUSupport

/**
 * What an entry point hands to `createRoot`/`Canvas`: a loader per renderer it can construct.
 *
 * The root entry provides both as dynamic imports, so an app downloads only the renderer its
 * Canvas asks for. `/legacy` and `/webgpu` provide one each, statically, for apps that would rather
 * have no extra request than the choice.
 */
export interface RendererProvider {
  webgl?: () => WebGLSupport | Promise<WebGLSupport>
  webgpu?: () => WebGPUSupport | Promise<WebGPUSupport>
}
