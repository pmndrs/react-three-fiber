// Registration with `strict: false`: registered keys stay typed, unregistered root keys are
// allowed and read loose (a LooseUniformEntry, usable without casts) instead of being errors.
// Only uniforms are registered here, so nodes stay unregistered and loose.
import type { Color, UniformNode as ThreeUniformNode } from 'three/webgpu'
import { useNodes, useUniforms } from '@react-three/tsl'
import { useFrame } from '../../packages/fiber/dist/webgpu/index'
import { color, mix, sin } from 'three/tsl'

declare module '@react-three/tsl' {
  interface Register {
    uniforms: { uTime: number; uColor: Color }
    strict: false
  }
}

export function Loose() {
  const all = useUniforms()
  const time: number = all.uTime.value
  // @ts-expect-error registered keys are still checked
  const wrong: string = all.uTime.value
  // An unregistered root key (created on the fly elsewhere) is allowed, and reads loose: usable
  // as is, still assignable where a uniform is expected, and one `as` from an exact type.
  const adhoc: UniformNode | UniformRecord = all.uWind
  all.uWind.mul(2)
  mix(color('red'), all.uColor, all.uWind)
  const wind = all.uWind as ThreeUniformNode<'color', Color>
  useFrame(({ uniforms }) => {
    const t: number = uniforms.uTime.value
    const loose: UniformNode | UniformRecord = uniforms.uAnything
    sin(uniforms.uAnything).mul(uniforms.uTime)
    void [t, loose]
  })

  // Nodes are not registered: every read is loose.
  useNodes().wobble.mul(2)
  useNodes(({ nodes }) => ({ glow: nodes.rimLightFn().mul(nodes.wobble) }))
  void [time, wrong, adhoc, wind]
  return null
}
