import { useMemo } from 'react'
import type { RenderTarget, WebGLRenderTarget } from 'three'
import { useThree } from './index'

import type { RenderTargetOptions, R3FRenderTarget } from '#types'

/**
 * Creates a render target compatible with the current renderer.
 *
 * Both classes live in three's shared core; which one you get follows the renderer this root
 * loaded: a `WebGLRenderTarget` on WebGL, a `RenderTarget` on WebGPU. The return type is the
 * union unless the app registered a renderer (`Register`) or the entry decides it (`/legacy`,
 * `/webgpu`).
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
export function useRenderTarget(options?: RenderTargetOptions): R3FRenderTarget
export function useRenderTarget(size: number, options?: RenderTargetOptions): R3FRenderTarget
export function useRenderTarget(width: number, height: number, options?: RenderTargetOptions): R3FRenderTarget
export function useRenderTarget(
  widthOrOptions?: number | RenderTargetOptions,
  heightOrOptions?: number | RenderTargetOptions,
  options?: RenderTargetOptions,
) {
  const support = useThree((s) => s.internal.support)
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
    // The support of the root's renderer carries the matching target class. Both constructors take
    // (width, height, options); the union only fails to unify on their option generics.
    const Target = support.RenderTarget as new (
      w: number,
      h: number,
      o?: RenderTargetOptions,
    ) => WebGLRenderTarget | RenderTarget
    return new Target(w, h, opts)
  }, [width, height, size.width, size.height, opts, support])
}
