// @react-three/tsl installed next to the /legacy entry. Every entry shares one core and one
// RootState, so the augmentation is visible here too: the fields exist on the type, and at runtime
// the tsl root extension decides per root what it sets up. Nothing WebGPU-specific leaks into the
// narrowed renderer, which stays a WebGLRenderer.
import type { WebGLRenderer } from 'three'
import '../../packages/tsl/dist/index'
import { useThree } from '../../packages/fiber/dist/legacy'

export function LegacyConsumer() {
  const renderer: WebGLRenderer = useThree((s) => s.renderer)
  const uniforms = useThree((s) => s.uniforms)
  // @ts-expect-error the narrowed renderer has no WebGPU compute
  renderer.compute
  void uniforms
  return null
}
