// Registration with `strict: false`: registered keys stay typed, unregistered root keys are
// allowed as the loose union instead of being errors.
import type { Color } from 'three/webgpu'
import { useUniforms } from '@react-three/tsl'
import { useFrame } from '../../packages/fiber/dist/webgpu/index'

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
  // An unregistered root key (created on the fly elsewhere) is allowed, as the loose union.
  const adhoc: UniformNode | UniformRecord = all.uWind
  useFrame(({ uniforms }) => {
    const t: number = uniforms.uTime.value
    const loose: UniformNode | UniformRecord = uniforms.uAnything
    void [t, loose]
  })
  void [time, wrong, adhoc]
  return null
}
