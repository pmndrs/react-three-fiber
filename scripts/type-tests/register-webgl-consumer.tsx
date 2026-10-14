// A library hook typed against @react-three/fiber/extension (the base types, which also run under
// /legacy), in an app that registered the WebGL renderer. `Register` narrows the base types, so the
// extension entry's hooks follow it. (The root entry's hooks are WebGPU-typed whatever is registered:
// it only renders with WebGPU. A WebGL app imports from /legacy.)
import type { WebGLRenderer } from 'three'
import { useThree } from '../../packages/fiber/dist/extension'
// Brings the root entry, where Register is declared, into the program for the augmentation below
import type {} from '../../packages/fiber/dist/index'

declare module '../../packages/fiber/dist/index' {
  interface Register {
    renderer: 'webgl'
  }
}

export function Registered() {
  const renderer: WebGLRenderer = useThree((s) => s.renderer)
  renderer.shadowMap.enabled = true
  // @ts-expect-error not a WebGPURenderer
  renderer.compute
  const isLegacy: true = useThree((s) => s.isLegacy)
  void isLegacy
  return null
}
