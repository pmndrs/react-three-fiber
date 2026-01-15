//* RenderTarget Types ==============================

/**
 * Re-export Three.js RenderTargetOptions type.
 * This ensures type compatibility with both WebGLRenderTarget and RenderTarget.
 */
import type { RenderTargetOptions as ThreeRenderTargetOptions } from 'three'
export type RenderTargetOptions = ThreeRenderTargetOptions
