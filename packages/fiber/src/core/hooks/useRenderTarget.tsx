import { useMemo } from 'react'
import {
  R3F_BUILD_LEGACY,
  R3F_BUILD_WEBGPU,
  RenderTarget,
  WebGLRenderTarget,
  RenderTargetCompat, // Alias used by single-renderer builds
} from '#three'
import { useThree } from './index'

import type { RenderTargetOptions } from '#types'

/**
 * Creates a render target compatible with the current renderer.
 *
 * - Legacy build: Returns WebGLRenderTarget
 * - WebGPU build: Returns RenderTarget
 * - Default build: Returns whichever matches the active renderer
 *
 * @example
 * ```tsx
 * // Use canvas size
 * const fbo = useRenderTarget()
 *
 * // Use canvas size with options
 * const fbo = useRenderTarget({ samples: 4 })
 *
 * // Square render target
 * const fbo = useRenderTarget(512)
 *
 * // Square render target with options
 * const fbo = useRenderTarget(512, { depthBuffer: true })
 *
 * // Explicit dimensions
 * const fbo = useRenderTarget(512, 256)
 *
 * // Explicit dimensions with options
 * const fbo = useRenderTarget(512, 256, { samples: 4 })
 * ```
 */
export function useRenderTarget(options?: RenderTargetOptions): RenderTarget | WebGLRenderTarget
export function useRenderTarget(size: number, options?: RenderTargetOptions): RenderTarget | WebGLRenderTarget
export function useRenderTarget(
  width: number,
  height: number,
  options?: RenderTargetOptions,
): RenderTarget | WebGLRenderTarget
export function useRenderTarget(
  widthOrOptions?: number | RenderTargetOptions,
  heightOrOptions?: number | RenderTargetOptions,
  options?: RenderTargetOptions,
) {
  const isLegacy = useThree((s) => s.isLegacy)
  const size = useThree((s) => s.size)

  // Parse arguments
  let width: number | undefined
  let height: number | undefined
  let opts: RenderTargetOptions | undefined

  if (typeof widthOrOptions === 'object') {
    // useRenderTarget(options)
    opts = widthOrOptions
  } else if (typeof widthOrOptions === 'number') {
    width = widthOrOptions
    if (typeof heightOrOptions === 'object') {
      // useRenderTarget(size, options)
      height = widthOrOptions
      opts = heightOrOptions
    } else if (typeof heightOrOptions === 'number') {
      // useRenderTarget(width, height, options?)
      height = heightOrOptions
      opts = options
    } else {
      // useRenderTarget(size)
      height = widthOrOptions
    }
  }

  return useMemo(() => {
    const w = width ?? size.width
    const h = height ?? size.height

    // Default build: both renderers available, runtime decision
    if (R3F_BUILD_LEGACY && R3F_BUILD_WEBGPU) {
      return isLegacy ? new WebGLRenderTarget(w, h, opts) : new RenderTarget(w, h, opts)
    }

    // Single-renderer builds: use the compat alias
    // Build flags ensure dead code elimination - only one branch survives
    return new RenderTargetCompat(w, h, opts)
  }, [width, height, size.width, size.height, opts, isLegacy])
}
