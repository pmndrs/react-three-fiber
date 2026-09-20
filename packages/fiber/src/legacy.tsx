/** WebGL entry with shared core APIs. */

import * as THREE from 'three'
import { WebGLRenderer, WebGLCubeRenderTarget } from 'three'
import { createRoot as createRootImpl } from './core/renderer'
import { Canvas as CanvasImpl } from './core/Canvas'
import type * as ReactThreeFiber from '../types/entries/legacy'
import type {
  CanvasProps,
  ReconcilerRoot,
  RendererProvider,
  RootCanvas,
  ThreeElementsOf,
  RenderTargetOptions,
} from '#types'
import { useRenderTarget as useRenderTargetCore } from './core/hooks/useRenderTarget'
export type { ReactThreeFiber }
export type * from '../types/three'
export * from './core'
export { createPointerEvents as events } from './core/events'

//* Build flags ==============================
// Available renderers. Each root records its active renderer in state.isLegacy.
export const R3F_BUILD_LEGACY = true
export const R3F_BUILD_WEBGPU = false

//* Renderer provider ==============================
// WebGL dependencies are reachable through Canvas and createRoot.
const provider: RendererProvider = {
  namespace: THREE,
  webgl: {
    kind: 'webgl',
    Renderer: WebGLRenderer,
    CubeRenderTarget: WebGLCubeRenderTarget,
    loadGainMapLoader: async () => (await import('@monogrid/gainmap-js')).GainMapLoader,
  },
}

/** Create a root that always constructs a WebGLRenderer. */
export function createRoot<TCanvas extends RootCanvas>(canvas: TCanvas): ReconcilerRoot<TCanvas> {
  return createRootImpl(canvas, provider)
}

/**
 * A DOM canvas which accepts threejs elements as children, rendered with WebGL.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export function Canvas(props: CanvasProps) {
  return <CanvasImpl {...props} provider={provider} />
}

//* Legacy-specific types ==============================
// Re-export LegacyRootState as RootState so useThree() returns WebGLRenderer-typed state
export type {
  LegacyRootState as RootState,
  LegacyInternalState as InternalState,
  LegacyRenderer as R3FRenderer,
  WebGLProps,
  WebGLDefaultProps,
  WebGLShadowConfig,
} from '../types/webgl'

// Preserve WebGL target types while sharing the hook implementation.
export const useRenderTarget = useRenderTargetCore as {
  (options?: RenderTargetOptions): THREE.WebGLRenderTarget
  (size: number, options?: RenderTargetOptions): THREE.WebGLRenderTarget
  (width: number, height: number, options?: RenderTargetOptions): THREE.WebGLRenderTarget
}

//* Element types ==============================
// Augment this entry's ThreeElements interface to add custom JSX elements.

/** Three.js constructors available as JSX elements on this entry. */
export type ThreeExports = typeof import('three')

export interface ThreeElements extends ThreeElementsOf<ThreeExports> {}

// Both JSX runtimes inherit React's intrinsic elements.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
