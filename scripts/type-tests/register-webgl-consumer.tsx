// An app on @react-three/fiber that registered the WebGL renderer.
import type { WebGLRenderer, WebGLRenderTarget } from 'three'
import { useRenderTarget, useThree } from '../../packages/fiber/dist/index'

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
  const target: WebGLRenderTarget = useRenderTarget()
  void [isLegacy, target]
  return null
}
