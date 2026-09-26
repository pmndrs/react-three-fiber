// An app on @react-three/fiber that registered the WebGPU renderer: every renderer-typed field
// narrows, with no cast and no change of import path.
import { createElement } from 'react'
import type { WebGPURenderer, RenderTarget } from 'three/webgpu'
import { Canvas, useFrame, useRenderTarget, useThree } from '../../packages/fiber/dist/index'
import type { RootState } from '../../packages/fiber/dist/index'

declare module '../../packages/fiber/dist/index' {
  interface Register {
    renderer: 'webgpu'
  }
}

export function Registered() {
  const renderer: WebGPURenderer = useThree((s) => s.renderer)
  renderer.compute(null as any)
  void renderer.backend

  const state: RootState = useThree()
  const isLegacy: false = state.isLegacy
  const kind: 'webgpu' = state.internal.support.kind
  const target: RenderTarget = useRenderTarget(256)
  // `gl` follows too, for code still on the deprecated name
  const gl: WebGPURenderer = state.gl

  useFrame(({ renderer }) => {
    renderer.compute(null as any)
  })

  createElement(Canvas, { renderer: true, onCreated: (created) => void created.renderer.compute })
  // The renderer prop is typed: constructor parameters, renderer properties and the config bag
  createElement(Canvas, {
    renderer: { antialias: true, forceWebGL: true, textureColorSpace: 'srgb', scheduler: { fps: 30 } },
  })
  // @ts-expect-error a typo is caught, not swallowed by `any`
  createElement(Canvas, { renderer: { antialis: true } })

  void [isLegacy, kind, target, gl]
  return null
}
