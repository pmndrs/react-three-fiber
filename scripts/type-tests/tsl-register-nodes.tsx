// Nodes registered with `strict: false`, uniforms not registered. Registered nodes are typed by
// name, unregistered root keys read loose instead of being errors, and the uniforms stay loose:
// registering nodes does not register uniforms.
import type { Node } from 'three/webgpu'
import { useNodes, useUniforms, type CreatorState } from '@react-three/tsl'
import { useFrame } from '../../packages/fiber/dist/index'
import { Fn, float, sin, vec3 } from 'three/tsl'

// Registered from the creator that makes them, so the types and the runtime come from one place.
export const sharedNodes = ({ uniforms }: CreatorState) => ({
  wobble: sin(uniforms.uTime.mul(2)).toVar(),
  tint: vec3(1, 0, 0),
  rimLight: Fn(() => vec3(1, 0, 0)),
})

declare module '@react-three/tsl' {
  interface Register {
    nodes: ReturnType<typeof sharedNodes>
    nodeScopes: { fx: { blur: Node<'float'> } }
    strict: false
  }
}

export function SharedNodes() {
  useNodes(sharedNodes)
  return null
}

export function Reader() {
  const all = useNodes()
  const tint: Node<'vec3'> = all.tint
  const rim: Node<'vec3'> = all.rimLight()
  // @ts-expect-error registered keys keep their node type: a vec3 is no float
  const wrong: Node<'float'> = all.tint
  // strict: false: an unregistered root key reads loose instead of being an error
  all.adhoc.mul(2)
  const blur: Node<'float'> = useNodes('fx').blur

  // Creators are still checked against the registered types.
  // @ts-expect-error tint is registered as a vec3 node
  useNodes(() => ({ tint: float(1) }))

  // Uniforms are not registered: loose reads, usable without casts.
  useUniforms().uTime.mul(2)
  useFrame(({ uniforms, nodes }) => {
    const w: Node<'vec3'> = nodes.tint
    uniforms.uTime.value += 1
    void w
  })
  void [tint, rim, wrong, blur]
  return null
}
