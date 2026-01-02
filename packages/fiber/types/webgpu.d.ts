import type { WebGPURenderer, WebGPURendererParameters } from 'three/webgpu'
import type { Properties } from './utils'
import type { BaseRendererProps, RendererFactory } from './renderer'

export type WebGPUDefaultProps = Omit<WebGPURendererParameters, 'canvas'> & BaseRendererProps

export type WebGPUProps =
  | RendererFactory<WebGPURenderer, WebGPUDefaultProps>
  | Partial<Properties<WebGPURenderer> | WebGPURendererParameters>

// WebGPU doesn't have shadow maps in the same way
export interface WebGPUShadowConfig {
  shadows?: boolean // Simplified for WebGPU
}
