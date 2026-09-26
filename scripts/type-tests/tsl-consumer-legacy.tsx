// @react-three/tsl installed next to the /legacy entry: the WebGL-only RootState gets nothing.
import '../../packages/tsl/dist/index'
import { useThree } from '../../packages/fiber/dist/legacy'

export function LegacyConsumer() {
  // @ts-expect-error /legacy never has a WebGPU render pipeline
  useThree((s) => s.renderPipeline)
  // @ts-expect-error nor TSL resources
  useThree((s) => s.uniforms)
  return null
}
