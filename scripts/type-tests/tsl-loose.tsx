// Unregistered reads (nothing in `Register`): every way to read a uniform or node by name yields a
// loose node that TSL accepts without a cast, and a single `as` still gives it an exact type.
// Compiled against the built declarations with the default fiber entry.
import { Color } from 'three/webgpu'
import type {
  MeshStandardNodeMaterial,
  Node,
  StorageBufferNode,
  StorageTexture,
  UniformNode,
  Vector3,
  Vector4,
} from 'three/webgpu'
import type { LooseNode, LooseNodeEntry } from '../../packages/tsl/dist/index'
import {
  useBuffers,
  useGPUStorage,
  useLocalNodes,
  useNodes,
  useUniform,
  useUniforms,
} from '../../packages/tsl/dist/index'
import { useFrame, useThree } from '../../packages/fiber/dist/index'
import {
  color,
  cross,
  float,
  fog,
  Fn,
  instanceIndex,
  mix,
  positionLocal,
  rangeFogFactor,
  sin,
  smoothstep,
  textureStore,
  uv,
  uvec2,
  vec3,
  vec4,
} from 'three/tsl'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

declare const m: MeshStandardNodeMaterial

//* Uniforms: the two read types ==============================

// A leaf (`useUniform('n')`, `useUniforms('scope').n`, a creator's `uniforms.scope('s').n`) is a
// LooseUniformNode; a root entry (`useUniforms().n`, `state.uniforms.n`, a creator's `uniforms.n`)
// is a LooseUniformEntry, which may also be a scope. Both pass the everyday operations.
export function uniformOps(n: LooseUniformNode, e: LooseUniformEntry) {
  for (const u of [n, e]) {
    u.mul(2)
    u.mul(u).add(float(1))
    m.colorNode = u
    m.positionNode = positionLocal.add(u)
    mix(color('red'), color('blue'), u)
    sin(u)
    smoothstep(0, 1, u)
    fog(u, rangeFogFactor(u, u))
    u.value = 5
    u.x
    vec3(u, u, u)
    u.toVar()
    // TSL functions keep their result types: these are float nodes again.
    sin(u).mul(2).toVar()
    mix(color('red'), color('blue'), u).mul(2)
    // .value reads and writes whatever the uniform holds.
    const value: number = u.value
    u.value = new Color()
    void value
  }

  // A misspelt member is still an error on a leaf. A root entry can be a scope, so any other name
  // reads as one of the scope's uniforms there.
  // @ts-expect-error not a member of any uniform node
  n.valeu
  e.uHealth.mul(2)

  // One `as` to an exact type, for the operations that need one (e.g. cross wants vec3).
  const tint = n as UniformNode<'color', Color>
  const tintValue: Color = tint.value
  const dir = e as UniformNode<'vec3', Vector3>
  cross(dir, dir)
  const rect = n as UniformNode<'vec4', Vector4>
  const rectValue: Vector4 = rect.value
  const asNode = n as Node<'vec3'>
  cross(asNode, asNode)
  const asFloat = e as UniformNode<'float', number>
  const floatValue: number = asFloat.value
  void [tintValue, rectValue, floatValue]
}

//* Uniforms: every read path ==============================

export function UniformReads() {
  // useUniforms(): root entries
  const all = useUniforms()
  type _All = Expect<Equal<typeof all.uTime, LooseUniformEntry>>
  all.uTime.mul(2)
  m.colorNode = mix(color('red'), color('blue'), all.uTime)
  all.player.uHealth.mul(2)
  all.removeUniforms('uTime')

  // useUniforms('scope'): leaves
  const fx = useUniforms('fx')
  type _Fx = Expect<Equal<typeof fx.blur, LooseUniformNode>>
  sin(fx.blur).mul(2)
  fx.clearUniforms()

  // useUniform('n'): a leaf
  const speed = useUniform('uSpeed')
  type _Speed = Expect<Equal<typeof speed, LooseUniformNode>>
  speed.value = 2
  m.positionNode = positionLocal.add(speed)

  // Creators: `uniforms.x` is a root entry, `uniforms.scope('s').x` a leaf
  const { wobble, damage } = useNodes(({ uniforms }) => {
    const player = uniforms.scope('player')
    type _Root = Expect<Equal<typeof uniforms.uTime, LooseUniformEntry>>
    type _Scoped = Expect<Equal<typeof player.uHealth, LooseUniformNode>>
    return {
      wobble: sin(uniforms.uTime.mul(2)),
      damage: uniforms.scope('player').uHealth.mul(2),
    }
  })
  void [wobble, damage]
  useLocalNodes(({ uniforms }) => ({ tint: mix(color('red'), color('blue'), uniforms.uMix) }), [])

  // useFrame and useThree: state.uniforms holds root entries
  useFrame(({ uniforms }, delta) => {
    type _Frame = Expect<Equal<typeof uniforms.uTime, LooseUniformEntry>>
    uniforms.uTime.value += delta
    uniforms.player.uHealth.value -= delta
    m.colorNode = uniforms.uColor
  })
  const viaThree = useThree((s) => s.uniforms.uTime)
  viaThree.mul(2)

  // A schema still gives exact types, and still rejects what is not in it.
  const typed = useUniforms<{ blur: number; tint: Color }>('fx')
  const blur: UniformNode<'float', number> = typed.blur
  // @ts-expect-error a schema reader rejects keys outside the schema
  typed.missing
  const exact = useUniform<Color>('uColor')
  const exactValue: Color = exact.value
  // @ts-expect-error a colour uniform is no float: no .toFloat()
  exact.toFloat()
  const scoped = useNodes(({ uniforms }) => {
    const player = uniforms.scope<{ uHealth: UniformNode<'float', number> }>('player')
    const hp: number = player.uHealth.value
    void hp
    return { hurt: player.uHealth.mul(2) }
  })
  void [blur, exactValue, scoped]
  return null
}

//* Nodes ==============================

const wobbleFn = Fn(() => float(1))
const uvFn = Fn(([coord]: [Node<'vec2'>]) => coord.x)

// A leaf (`useNodes('scope').n`, a creator's `nodes.scope('s').n`) is a LooseNode; a root entry
// (`useNodes().n`, `state.nodes.n`, a creator's `nodes.n`) a LooseNodeEntry, which may be a scope.
export function nodeOps(n: LooseNode, e: LooseNodeEntry) {
  for (const x of [n, e]) {
    x.mul(2)
    m.colorNode = x
    m.positionNode = positionLocal.add(x)
    sin(x).mul(2)
    mix(color('red'), color('blue'), x)
    vec3(x, x, x)
    // Shared nodes are often Fn() callables: a read can be called.
    x()
    x().mul(2)
    m.colorNode = x()
    x(uv())
  }
  // @ts-expect-error not a member of any node
  n.mull(2)
  e.blur.mul(2)

  // One `as` to an exact type
  const v = n as Node<'vec3'>
  cross(v, v)
  const fn = e as typeof wobbleFn
  fn().toVar()
  const withArgs = n as typeof uvFn
  withArgs(uv()).mul(2)
}

export function NodeReads() {
  const all = useNodes()
  type _All = Expect<Equal<typeof all.wobble, LooseNodeEntry>>
  all.wobble.mul(2)
  all.rimLightFn()
  all.fx.blur.mul(2)
  all.rebuildNodes()

  const fx = useNodes('fx')
  type _Fx = Expect<Equal<typeof fx.blur, LooseNode>>
  m.colorNode = fx.blur

  const { glow } = useNodes(({ nodes }) => {
    const effects = nodes.scope('effects')
    type _Root = Expect<Equal<typeof nodes.wobble, LooseNodeEntry>>
    type _Scoped = Expect<Equal<typeof effects.blur, LooseNode>>
    return { glow: nodes.scope('effects').rimLightFn().add(nodes.wobble) }
  })
  void glow

  useFrame(({ nodes }) => {
    type _Frame = Expect<Equal<typeof nodes.wobble, LooseNodeEntry>>
    m.colorNode = nodes.wobble
  })

  // A schema still gives exact types
  const typed = useNodes<{ blur: Node<'vec4'> }>('fx')
  const blur: Node<'vec4'> = typed.blur
  // @ts-expect-error a schema reader rejects keys outside the schema
  typed.missing
  void blur
  return null
}

//* Buffers and GPU storage ==============================

// Not loose: a read is the union of what the hook stores (a typed array is nothing like a buffer
// node). One `as` or a schema narrows it.
export function BufferAndStorageReads() {
  const positions = useBuffers('particles').positions as StorageBufferNode<'vec3'>
  positions.element(instanceIndex).assign(vec3(0))
  const typed = useBuffers<{ positions: StorageBufferNode<'vec3'> }>('particles')
  typed.positions.element(instanceIndex).assign(vec3(1))
  const velocities = useBuffers().velocities as Float32Array
  velocities[0] = 1
  // @ts-expect-error the union has no buffer-node methods until narrowed
  useBuffers('particles').positions.element(instanceIndex)

  const height = useGPUStorage('terrain').heightMap as StorageTexture
  textureStore(height, uvec2(0, 0), vec4(1))
  const storage = useGPUStorage<{ heightMap: StorageTexture }>('terrain')
  textureStore(storage.heightMap, uvec2(0, 0), vec4(1))
  return null
}
