// An app's view of @react-three/tsl next to the fiber entries, compiled against the built
// declarations with skipLibCheck off. The fiber entries resolve through tsl's own dependency
// (a workspace link), which is also where its RootState augmentation points.
import type { Color, UniformNode, RenderPipeline, Vector2 } from 'three/webgpu'
import { useUniforms, useUniform, useNodes, useLocalNodes, useRenderPipeline } from '../../packages/tsl/dist/index'
import { useFrame, useStore, useThree } from '../../packages/fiber/dist/webgpu/index'
import { float, mix, color, sin, int, vec2 } from 'three/tsl'

export function Consumer() {
  // Creator inference survives the package boundary.
  const { uTime } = useUniforms({ uTime: 0 })
  const typed: UniformNode<'float', number> = uTime
  // TSL constant inputs unwrap to three's exact uniform node (#3769).
  const tsl = useUniforms({ uMode: int(1), uOffset: vec2(0, 1), uTint: color('#88ccff') })
  const tslTyped: [UniformNode<'int', number>, UniformNode<'vec2', Vector2>, UniformNode<'color', Color>] = [
    tsl.uMode,
    tsl.uOffset,
    tsl.uTint,
  ]
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

  void [typed, tslTyped, single, n, uniforms, pipeline, ready]
  return null
}

// The documented useLocalNodes examples (the hook's and ScopedStore's docblocks), unregistered.
export function LocalNodesDocs({ pattern }: { pattern: 'noise' | 'stripes' }) {
  // A scope read with its schema
  const { damage } = useLocalNodes(({ uniforms }) => {
    const player = uniforms.scope<{ uHealth: UniformNode<'float', number> }>('player')
    return { damage: player.uHealth.mul(2) }
  }, [])

  // A structural input declared in deps
  const { result } = useLocalNodes(
    ({ nodes }) => ({ result: pattern === 'noise' ? nodes.noise : nodes.stripes }),
    [pattern],
  )

  // A cast leaf
  const { colorNode } = useLocalNodes(({ uniforms }) => {
    const uValue = uniforms.myUniform as UniformNode<'float', number>
    return { colorNode: mix(color('red'), color('blue'), uValue) }
  }, [])

  // The install form
  useLocalNodes(({ scene }) => {
    const fogNode = sin(float(1))
    return () => {
      void [scene, fogNode]
      return () => {}
    }
  }, [])

  return { damage, result, colorNode }
}
