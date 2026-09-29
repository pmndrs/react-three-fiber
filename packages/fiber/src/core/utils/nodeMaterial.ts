import type { RootState } from '#types'

/**
 * Throws if a node material (or an array containing one) is used on a legacy WebGLRenderer root,
 * which cannot compile them and would otherwise crash on the first frame with an unhelpful error.
 * @see https://github.com/pmndrs/react-three-fiber/issues/3889
 */
export function assertNodeMaterialSupported(state: RootState | undefined, value: unknown): void {
  if (!state?.isLegacy) return
  const material = (Array.isArray(value) ? value : [value]).find((m) => m?.isNodeMaterial)
  if (!material) return
  throw new Error(
    `R3F: ${material.type ?? 'Node material'} requires WebGPURenderer (it falls back to WebGL2 automatically). Pass \`renderer\` to <Canvas> from @react-three/fiber, or import from @react-three/fiber/webgpu.`,
  )
}
