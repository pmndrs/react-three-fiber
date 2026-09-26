// An app's view of @react-three/tsl next to the fiber entries, compiled against the built
// declarations with skipLibCheck off. The fiber entries resolve through tsl's own dependency
// (a workspace link), which is also where its RootState augmentation points.
import type { UniformNode, RenderPipeline } from 'three/webgpu'
import { useUniforms, useUniform, useNodes, useRenderPipeline } from '../../packages/tsl/dist/index'
import { useFrame, useStore, useThree } from '../../packages/fiber/dist/webgpu/index'
import { float } from 'three/tsl'

export function Consumer() {
  // Creator inference survives the package boundary.
  const { uTime } = useUniforms({ uTime: 0 })
  const typed: UniformNode<'float', number> = uTime
  const single = useUniform('uSpeed', 1)
  const { n } = useNodes(() => ({ n: float(1) }))

  // The resources are on RootState, augmented per entry: frame state and useThree read them.
  useFrame(({ uniforms, nodes }) => {
    void [uniforms.uTime, nodes.n]
  })
  const uniforms = useThree((s) => s.uniforms)
  // ...and so does every other way to the state: the store, get(), and the primary's store.
  const store = useStore()
  void [store.getState().uniforms, useThree((s) => s.get().nodes), store.getState().primaryStore.getState().buffers]

  // The render pipeline is absent until useRenderPipeline creates one, hence optional.
  const pipeline: RenderPipeline | null | undefined = useThree((s) => s.renderPipeline)

  const api = useRenderPipeline()
  const ready: boolean = api.isReady

  void [typed, single, n, uniforms, pipeline, ready]
  return null
}
