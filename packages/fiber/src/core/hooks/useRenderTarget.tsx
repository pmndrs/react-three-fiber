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
 * @param width - Target width (defaults to canvas width)
 * @param height - Target height (defaults to canvas height)
 * @param options - Three.js RenderTarget options
 *
 * @example
 * ```tsx
 * function PortalScene() {
 *   const fbo = useRenderTarget(512, 512, { depthBuffer: true })
 *
 *   useFrame(({ renderer, scene, camera }) => {
 *     renderer.setRenderTarget(fbo)
 *     renderer.render(scene, camera)
 *     renderer.setRenderTarget(null)
 *   })
 *
 *   return (
 *     <mesh>
 *       <planeGeometry />
 *       <meshBasicMaterial map={fbo.texture} />
 *     </mesh>
 *   )
 * }
 * ```
 */
export function useRenderTarget(width?: number, height?: number, options?: RenderTargetOptions) {
  const isLegacy = useThree((s) => s.isLegacy)
  const size = useThree((s) => s.size)

  return useMemo(() => {
    const w = width ?? size.width
    const h = height ?? size.height

    // Default build: both renderers available, runtime decision
    if (R3F_BUILD_LEGACY && R3F_BUILD_WEBGPU) {
      return isLegacy ? new WebGLRenderTarget(w, h, options) : new RenderTarget(w, h, options)
    }

    // Single-renderer builds: use the compat alias
    // Build flags ensure dead code elimination - only one branch survives
    return new RenderTargetCompat(w, h, options)
  }, [width, height, size.width, size.height, options, isLegacy])
}
