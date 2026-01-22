import type { WebGPURenderer, WebGPURendererParameters } from 'three/webgpu'
import type { Properties } from './utils'
import type { BaseRendererProps, RendererFactory } from './renderer'
import type { RootState, InternalState } from './store'

//* Renderer Props ========================================

export type WebGPUDefaultProps = Omit<WebGPURendererParameters, 'canvas'> & BaseRendererProps

export type WebGPUProps =
  | RendererFactory<WebGPURenderer, WebGPUDefaultProps>
  | Partial<Properties<WebGPURenderer> | WebGPURendererParameters>

// WebGPU doesn't have shadow maps in the same way
export interface WebGPUShadowConfig {
  shadows?: boolean // Simplified for WebGPU
}

//* WebGPU-specific Types ========================================

/** WebGPU renderer type - re-exported as R3FRenderer from @react-three/fiber/webgpu */
export type WebGPUR3FRenderer = WebGPURenderer

/** WebGPU internal state with narrowed renderer type */
export interface WebGPUInternalState extends Omit<InternalState, 'actualRenderer'> {
  actualRenderer: WebGPURenderer
}

/**
 * WebGPU-specific RootState with narrowed renderer type.
 * Automatically used when importing from `@react-three/fiber/webgpu`.
 *
 * @example
 * ```tsx
 * import { useThree } from '@react-three/fiber/webgpu'
 *
 * function MyComponent() {
 *   const { renderer } = useThree()
 *   // renderer is typed as WebGPURenderer
 *   renderer.compute(computePass)
 * }
 * ```
 */
export interface WebGPURootState extends Omit<RootState, 'renderer' | 'gl' | 'internal'> {
  /** @deprecated Use `renderer` instead */
  gl: WebGPURenderer
  /** The WebGPU renderer instance */
  renderer: WebGPURenderer
  /** Internals with WebGPU renderer */
  internal: WebGPUInternalState
}
