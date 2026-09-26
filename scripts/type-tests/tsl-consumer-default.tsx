// @react-three/tsl with the default fiber entry: the RootState augmentation reaches it.
import type { RenderPipeline } from 'three/webgpu'
import '../../packages/tsl/dist/index'
import { useFrame, useThree } from '../../packages/fiber/dist/index'

export function DefaultConsumer() {
  const pipeline: RenderPipeline | null | undefined = useThree((s) => s.renderPipeline)
  const uniforms = useThree((s) => s.uniforms)
  useFrame(({ uniforms, gpuStorage }) => {
    void [uniforms.uTime, gpuStorage]
  })
  void [pipeline, uniforms]
  return null
}
