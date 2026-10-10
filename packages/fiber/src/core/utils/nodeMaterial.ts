import type { RootState } from '#types'
import { isDevelopment } from './notices'

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
    `R3F: ${material.type ?? 'Node material'} requires WebGPURenderer (it falls back to WebGL2 automatically). Import Canvas from @react-three/fiber or @react-three/fiber/webgpu instead of @react-three/fiber/legacy.`,
  )
}

const warnedGLSL = new Set<string>()

/**
 * Warns once per material type when a GLSL material (`ShaderMaterial`, `RawShaderMaterial` or a
 * subclass) is used on a WebGPURenderer root. WebGPURenderer cannot compile GLSL: three logs
 * `Material "ShaderMaterial" is not compatible` and draws the object with a blank default material.
 * Since `@react-three/fiber` renders with WebGPU, this is what an unmigrated WebGL scene runs into.
 */
export function warnGLSLMaterialUnsupported(state: RootState | undefined, value: unknown): void {
  if (!state || state.isLegacy || state.internal?.support?.kind !== 'webgpu' || !isDevelopment()) return
  const material = (Array.isArray(value) ? value : [value]).find((m) => m?.isShaderMaterial && !m.isNodeMaterial)
  if (!material) return
  const type: string = material.type ?? 'ShaderMaterial'
  if (warnedGLSL.has(type)) return
  warnedGLSL.add(type)
  console.warn(
    `R3F: ${type} is a GLSL material, which WebGPURenderer cannot compile; three draws it with a blank ` +
      'default material. @react-three/fiber renders with WebGPU: import Canvas from ' +
      '@react-three/fiber/legacy to keep WebGLRenderer, or port the shader to a node material (TSL).',
  )
}
