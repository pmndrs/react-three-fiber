import { useMemo } from 'react'
import { RenderTarget, WebGLRenderTarget } from 'three'
import { useThree } from './index'

import type { RenderTargetOptions } from '#types'

/**
 * Creates a render target compatible with the current renderer.
 *
 * - WebGL: Returns WebGLRenderTarget
 * - WebGPU: Returns RenderTarget
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
export function useRenderTarget(options?: RenderTargetOptions): RenderTarget
export function useRenderTarget(size: number, options?: RenderTargetOptions): RenderTarget
export function useRenderTarget(width: number, height: number, options?: RenderTargetOptions): RenderTarget
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
    // Both classes live in three's core, so the choice is the root's active renderer.
    return isLegacy ? new WebGLRenderTarget(w, h, opts) : new RenderTarget(w, h, opts)
  }, [width, height, size.width, size.height, opts, isLegacy])
}
