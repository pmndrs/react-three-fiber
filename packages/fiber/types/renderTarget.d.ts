//* RenderTarget Types ==============================

/**
 * Options for creating a render target via useRenderTarget hook.
 * Maps to Three.js RenderTarget/WebGLRenderTarget options.
 */
export interface RenderTargetOptions {
  /** Texture wrap mode for S coordinate. Default: ClampToEdgeWrapping */
  wrapS?: number
  /** Texture wrap mode for T coordinate. Default: ClampToEdgeWrapping */
  wrapT?: number
  /** Texture magnification filter. Default: LinearFilter */
  magFilter?: number
  /** Texture minification filter. Default: LinearFilter */
  minFilter?: number
  /** Texture format. Default: RGBAFormat */
  format?: number
  /** Texture data type. Default: UnsignedByteType */
  type?: number
  /** Anisotropic filtering level. Default: 1 */
  anisotropy?: number
  /** Color space for the texture. Default: '' (no color space conversion) */
  colorSpace?: string
  /** Whether to create a depth buffer. Default: true */
  depthBuffer?: boolean
  /** Whether to create a stencil buffer. Default: false */
  stencilBuffer?: boolean
  /** MSAA sample count for WebGPU/WebGL2. Default: 0 (no MSAA) */
  samples?: number
  /** Number of render targets for MRT (WebGPU only). Default: 1 */
  count?: number
  /** Depth texture for custom depth handling */
  depthTexture?: any
  /** Whether to generate mipmaps. Default: false */
  generateMipmaps?: boolean
}
