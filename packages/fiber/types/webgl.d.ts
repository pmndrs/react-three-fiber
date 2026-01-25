import type * as THREE from 'three'
import type { Properties } from './utils'
import type { BaseRendererProps, RendererFactory } from './renderer'
import type { RootState, InternalState } from './store'

//* Renderer Props ========================================

export type WebGLDefaultProps = Omit<THREE.WebGLRendererParameters, 'canvas'> & BaseRendererProps

export type WebGLProps =
  | RendererFactory<THREE.WebGLRenderer, WebGLDefaultProps>
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>

export interface WebGLShadowConfig {
  shadows?: boolean | 'basic' | 'percentage' | 'soft' | 'variance' | Partial<THREE.WebGLShadowMap>
}

//* Legacy-specific Types ========================================

/** Legacy (WebGL) renderer type - re-exported as R3FRenderer from @react-three/fiber/legacy */
export type LegacyRenderer = THREE.WebGLRenderer

/** Legacy internal state with narrowed renderer type */
export interface LegacyInternalState extends Omit<InternalState, 'actualRenderer'> {
  actualRenderer: THREE.WebGLRenderer
}

/**
 * Legacy-specific RootState with narrowed renderer type.
 * Automatically used when importing from `@react-three/fiber/legacy`.
 *
 * @example
 * ```tsx
 * import { useThree } from '@react-three/fiber/legacy'
 *
 * function MyComponent() {
 *   const { renderer } = useThree()
 *   // renderer is typed as THREE.WebGLRenderer
 *   renderer.shadowMap.enabled = true
 * }
 * ```
 */
export interface LegacyRootState extends Omit<RootState, 'renderer' | 'internal'> {
  /** The WebGL renderer instance */
  renderer: THREE.WebGLRenderer
  /** Internals with WebGL renderer */
  internal: LegacyInternalState
}
