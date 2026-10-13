// An app that registers its uniforms, nodes, buffers and GPU storage (strict, the default). Compiled on its own:
// `Register` is global to a program, so it cannot share one with the unregistered fixtures.
import { Color, StorageTexture, Vector3 } from 'three/webgpu'
import type { Node, StorageBufferNode, UniformNode } from 'three/webgpu'
import {
  useUniforms,
  useUniform,
  useNodes,
  useLocalNodes,
  useBuffers,
  useGPUStorage,
  configureTSL,
} from '@react-three/tsl'
import { useFrame, useStore, useThree } from '../../packages/fiber/dist/webgpu/index'
import { Fn, cross, float, instanceIndex, instancedArray, mix, sin, texture, time, vec3, vec4 } from 'three/tsl'

export const globalUniforms = { uTime: 0, uColor: new Color('hotpink') }
export const playerUniforms = { uHealth: 1, uTint: new Color('white') }
export const rimLightFn = Fn(() => vec3(1, 0, 0))

declare module '@react-three/tsl' {
  interface Register {
    uniforms: typeof globalUniforms
    scopes: { player: typeof playerUniforms }
    nodes: { wobble: Node<'float'>; rimLight: typeof rimLightFn }
    nodeScopes: { fx: { blur: Node<'vec4'> } }
    buffers: { positions: StorageBufferNode<'vec3'>; seeds: Float32Array }
    bufferScopes: { particles: { colors: StorageBufferNode<'vec4'> } }
    gpuStorage: { heightMap: StorageTexture }
    gpuStorageScopes: { terrain: { normals: StorageTexture } }
  }
}

configureTSL({ uniforms: globalUniforms, scopes: { player: playerUniforms } })

export function Registered() {
  // Reading: typed by name, no generics.
  const all = useUniforms()
  const time: number = all.uTime.value
  const color: Color = all.uColor.value
  const health: number = all.player.uHealth.value
  // @ts-expect-error a typo on the root is caught
  all.uTiem
  // @ts-expect-error the value type is checked too
  const wrong: string = all.uTime.value

  const player = useUniforms('player')
  const hp: number = player.uHealth.value
  // @ts-expect-error not in the registered scope
  player.uArmor

  // Registered reads are three's exact nodes: a float has no .z, and cross() wants a vec3.
  const exactTime: UniformNode<'float', number> = all.uTime
  // @ts-expect-error a float uniform has no .z
  all.uTime.z
  // @ts-expect-error cross() takes vec3 nodes, not a float
  cross(all.uTime, all.uTime)

  // Unregistered scopes and names fall back to the loose reader, usable without casts.
  useUniforms('enemy').uArmor.mul(2)
  const t: number = useUniform('uTime').value
  sin(useUniform('uNotRegistered')).mul(2)

  // Creating: new keys are free, registered keys keep their registered type.
  useUniforms(() => ({ uTime: 0, uWind: new Vector3() }))
  // @ts-expect-error uTime is registered as a number
  useUniforms(() => ({ uTime: 'fast' }))
  useUniforms({ uHealth: 0.5 }, 'player')
  // @ts-expect-error uHealth is registered as a number in 'player'
  useUniforms({ uHealth: new Color() }, 'player')

  // Frame callbacks: state.uniforms is typed by name.
  useFrame(({ uniforms }, delta) => {
    uniforms.uTime.value += delta
    uniforms.player.uTint.value.set('red')
    // @ts-expect-error a typo is caught here too
    uniforms.uTiem
  })

  // useThree reads the same typed map.
  const uColor: Color = useThree((s) => s.uniforms.uColor.value)
  // @ts-expect-error and catches typos
  useThree((s) => s.uniforms.uColour)
  // So do the store and get().
  const store = useStore()
  const viaStore: number = store.getState().uniforms.uTime.value
  const viaGet: number = useThree((s) => s.get().uniforms.player.uHealth.value)

  // Creators: uniforms typed by name, scopes through .scope() or by key.
  useNodes(({ uniforms }) => ({
    tinted: mix(uniforms.uColor, uniforms.player.uTint, uniforms.uTime),
    hurt: uniforms.scope('player').uHealth,
  }))
  // @ts-expect-error a typo in a creator is caught
  useNodes(({ uniforms }) => ({ n: uniforms.uTiem }))

  void [time, color, health, wrong, hp, t, uColor, viaStore, viaGet, exactTime]
  return null
}

export function RegisteredNodes() {
  // Reading: typed by name.
  const all = useNodes()
  const wobble: Node<'float'> = all.wobble
  const rim: Node<'vec3'> = all.rimLight()
  const blur: Node<'vec4'> = all.fx.blur
  // @ts-expect-error a typo on the root is caught
  all.wobbel
  // @ts-expect-error and the node type is checked: a float has no .z
  all.wobble.z

  const fx = useNodes('fx')
  const fxBlur: Node<'vec4'> = fx.blur
  // @ts-expect-error not in the registered scope
  fx.glow

  // Unregistered scopes fall back to the loose reader.
  useNodes('other').anything.mul(2)

  // Creating: new keys are free, registered keys keep their registered type.
  useNodes(() => ({ wobble: sin(time), extra: vec3(0, 1, 0) }))
  // @ts-expect-error wobble is registered as a float node
  useNodes(() => ({ wobble: vec3(0, 1, 0) }))
  useNodes(() => ({ blur: vec4(0) }), 'fx')
  // @ts-expect-error blur is registered as a vec4 node in 'fx'
  useNodes(() => ({ blur: float(0) }), 'fx')
  useNodes(() => ({ anything: float(0) }), 'other')
  // A scope only known at runtime is not checked (it may or may not be a registered one).
  const runtimeScope = Math.random() > 0.5 ? 'fx' : (undefined as string | undefined)
  useNodes(() => ({ blur: float(0) }), runtimeScope)

  // Creators read nodes and uniforms by name.
  useNodes(({ nodes, uniforms }) => ({
    glow: nodes.rimLight().mul(nodes.wobble).mul(uniforms.uTime),
    soft: nodes.scope('fx').blur.mul(0.5),
    viaDot: nodes.fx.blur,
  }))
  // @ts-expect-error a typo in a creator is caught
  useNodes(({ nodes }) => ({ n: nodes.wobbel }))

  // Frame callbacks and useThree: state.nodes is typed by name.
  useFrame(({ nodes }) => {
    const w: Node<'float'> = nodes.wobble
    // @ts-expect-error a typo is caught here too
    nodes.wobbel
    void w
  })
  const viaThree: Node<'vec4'> = useThree((s) => s.nodes.fx.blur)

  void [wobble, rim, blur, fxBlur, viaThree]
  return null
}

// The documented useLocalNodes example with registered uniforms: typed by name, no cast.
export function RegisteredLocalNodes() {
  const { wobble, playerHealth, viaDot } = useLocalNodes(
    ({ uniforms }) => ({
      wobble: sin(uniforms.uTime.mul(2)),
      playerHealth: uniforms.scope('player').uHealth,
      viaDot: uniforms.player.uHealth,
    }),
    [],
  )
  const health: number = playerHealth.value
  const dot: number = viaDot.value
  return { wobble, health, dot }
}

export function RegisteredBuffers() {
  // Reading: typed by name, through every read path.
  const all = useBuffers()
  const positions: StorageBufferNode<'vec3'> = all.positions
  all.positions.element(instanceIndex).assign(vec3(0))
  const seed: number = all.seeds[0]
  const colors: StorageBufferNode<'vec4'> = all.particles.colors
  // @ts-expect-error a typo on the root is caught
  all.positons
  // @ts-expect-error and the type is checked: a typed array has no .element()
  all.seeds.element(instanceIndex)

  const particles = useBuffers('particles')
  particles.colors.element(instanceIndex)
  // @ts-expect-error not in the registered scope
  particles.sizes
  // Unregistered scopes keep the BufferLike reader.
  const other = useBuffers('other').anything as Float32Array

  // Creating: new keys are free, registered keys keep their registered type.
  useBuffers(() => ({ positions: instancedArray(4, 'vec3'), extra: new Float32Array(4) }))
  // @ts-expect-error positions is registered as a vec3 buffer node
  useBuffers(() => ({ positions: new Float32Array(12) }))
  useBuffers(() => ({ colors: instancedArray(4, 'vec4') }), 'particles')
  // @ts-expect-error colors is registered as a vec4 buffer node in 'particles'
  useBuffers(() => ({ colors: instancedArray(4, 'vec3') }), 'particles')
  // A scope only known at runtime is not checked.
  const runtimeScope = Math.random() > 0.5 ? 'particles' : (undefined as string | undefined)
  useBuffers(() => ({ colors: new Float32Array(4) }), runtimeScope)

  // Creators and frame state read them by name.
  useNodes(({ buffers }) => ({
    p: buffers.positions.element(instanceIndex),
    c: buffers.scope('particles').colors.element(instanceIndex),
    viaDot: buffers.particles.colors.element(instanceIndex),
  }))
  // @ts-expect-error a typo in a creator is caught
  useNodes(({ buffers }) => ({ n: buffers.positons }))
  useFrame(({ buffers }) => {
    const p: StorageBufferNode<'vec3'> = buffers.positions
    // @ts-expect-error a typo is caught here too
    buffers.seedz
    void p
  })
  const viaThree: Float32Array = useThree((s) => s.buffers.seeds)

  void [positions, seed, colors, other, viaThree]
  return null
}

export function RegisteredGPUStorage() {
  const all = useGPUStorage()
  const height: StorageTexture = all.heightMap
  texture(all.terrain.normals)
  // @ts-expect-error a typo on the root is caught
  all.heightmap

  const terrain = useGPUStorage('terrain')
  const normals: StorageTexture = terrain.normals
  // @ts-expect-error not in the registered scope
  terrain.albedo
  const other = useGPUStorage('other').anything as StorageTexture

  useGPUStorage(() => ({ heightMap: new StorageTexture(64, 64), extra: new StorageTexture(8, 8) }))
  // @ts-expect-error heightMap is registered as a StorageTexture, not a buffer node
  useGPUStorage(() => ({ heightMap: instancedArray(4, 'vec3') }))
  useGPUStorage(() => ({ normals: new StorageTexture(64, 64) }), 'terrain')
  // @ts-expect-error normals is registered as a StorageTexture in 'terrain'
  useGPUStorage(() => ({ normals: instancedArray(4, 'vec3') }), 'terrain')
  const runtimeScope = Math.random() > 0.5 ? 'terrain' : (undefined as string | undefined)
  useGPUStorage(() => ({ normals: instancedArray(4, 'vec3') }), runtimeScope)

  useNodes(({ gpuStorage }) => ({
    h: texture(gpuStorage.heightMap),
    n: texture(gpuStorage.scope('terrain').normals),
  }))
  // @ts-expect-error a typo in a creator is caught
  useNodes(({ gpuStorage }) => ({ n: gpuStorage.heightmap }))
  useFrame(({ gpuStorage }) => {
    const h: StorageTexture = gpuStorage.heightMap
    // @ts-expect-error a typo is caught here too
    gpuStorage.heightmap
    void h
  })
  const viaThree: StorageTexture = useThree((s) => s.gpuStorage.terrain.normals)

  void [height, normals, other, viaThree]
  return null
}
