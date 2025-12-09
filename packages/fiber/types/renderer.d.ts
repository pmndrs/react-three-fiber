import type * as THREE from 'three'

//* Base Renderer Types =====================================

// Base renderer types that both WebGL and WebGPU share
export interface BaseRendererProps {
  canvas: HTMLCanvasElement | OffscreenCanvas
  powerPreference?: 'high-performance' | 'low-power' | 'default'
  antialias?: boolean
  alpha?: boolean
}

export type RendererFactory<TRenderer, TParams> =
  | TRenderer
  | ((defaultProps: TParams) => TRenderer)
  | ((defaultProps: TParams) => Promise<TRenderer>)

export interface Renderer {
  render: (scene: THREE.Scene, camera: THREE.Camera) => any
}
