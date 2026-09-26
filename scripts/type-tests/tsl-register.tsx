// An app that registers its uniforms (strict, the default). Compiled on its own: `Register` is
// global to a program, so it cannot share one with the unregistered fixtures.
import { Color, Vector3 } from 'three/webgpu'
import { useUniforms, useUniform, useNodes, configureTSL } from '@react-three/tsl'
import { useFrame, useStore, useThree } from '../../packages/fiber/dist/webgpu/index'
import { mix } from 'three/tsl'

export const globalUniforms = { uTime: 0, uColor: new Color('hotpink') }
export const playerUniforms = { uHealth: 1, uTint: new Color('white') }

declare module '@react-three/tsl' {
  interface Register {
    uniforms: typeof globalUniforms
    scopes: { player: typeof playerUniforms }
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

  // Unregistered scopes and names fall back to the loose reader.
  useUniforms('enemy').uArmor
  const t: number = useUniform('uTime').value
  useUniform('uNotRegistered')

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

  void [time, color, health, wrong, hp, t, uColor, viaStore, viaGet]
  return null
}
