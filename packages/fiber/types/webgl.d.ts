import type * as THREE from 'three'
import type { Properties } from './utils'
import type { BaseRendererProps, RendererFactory } from './renderer'

export type WebGLDefaultProps = Omit<THREE.WebGLRendererParameters, 'canvas'> & BaseRendererProps

export type WebGLProps =
  | RendererFactory<THREE.WebGLRenderer, WebGLDefaultProps>
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>

export interface WebGLShadowConfig {
  shadows?: boolean | 'basic' | 'percentage' | 'soft' | 'variance' | Partial<THREE.WebGLShadowMap>
}
