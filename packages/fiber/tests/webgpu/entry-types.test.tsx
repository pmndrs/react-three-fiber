/**
 * WebGPU entry type narrowing — compile-time guard for #3851.
 *
 * The assertions that matter here are checked by `tsc`, not by vitest: the repo's tsconfig
 * includes `packages/**\/*`, so `pnpm typecheck` compiles this file on every CI run and a
 * regression in the entry's declared types fails the build. `typeAssertions()` is deliberately
 * never called — its body only has to *compile*.
 *
 * Before the fix, `useThree`/`useFrame` on this entry came from the star re-export of `../core`
 * and were typed against the base RootState, whose `renderer` is the R3FRenderer union
 * (WebGLRenderer included). Every WebGPU-only call needed a cast:
 *
 *   const renderer = useThree((s) => s.renderer) as unknown as WebGPURenderer
 *
 * The runtime test below pins the other half of the contract: this is a types-only narrowing,
 * so the exported values must still be the core implementations.
 */
import type { WebGPURenderer } from 'three/webgpu'

import { useThree, useFrame } from '../../src/webgpu'
import { useThree as useThreeCore, useFrame as useFrameCore } from '../../src/core'
import type { RootState as WebGPURootState } from '../../src/webgpu'

/** Never invoked — this exists so `tsc` checks the bodies. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function typeAssertions() {
  // useThree: the selected renderer is a WebGPURenderer, no cast.
  const renderer: WebGPURenderer = useThree((s) => s.renderer)
  // The WebGPU-only members from the issue must resolve.
  renderer.compute(null as any)
  void renderer.computeAsync
  void renderer.backend

  // useThree with no selector hands back the narrowed state.
  const state: WebGPURootState = useThree()
  const fromState: WebGPURenderer = state.renderer

  // `gl` is narrowed too — on the base RootState it is a WebGLRenderer.
  const gl: WebGPURenderer = useThree((s) => s.gl)

  // useFrame's callback state is narrowed the same way. This is the `DepthAttachmentSync`
  // pattern from the docs, which previously needed
  //   (state.renderer as unknown as { backend?: { updateSize?(): void } }).backend
  useFrame((frameState) => {
    const frameRenderer: WebGPURenderer = frameState.renderer
    frameRenderer.compute(null as any)
    void frameState.delta
  })

  // A selector returning something other than the renderer still infers normally.
  const width: number = useThree((s) => s.size.width)

  void [renderer, state, fromState, gl, width]
}

describe('webgpu entry: narrowed state hooks (#3851)', () => {
  it('re-exports the core implementations unchanged (types-only narrowing)', () => {
    // If these ever diverge, the entry has grown a second code path to keep in sync — which is
    // exactly what re-typing rather than wrapping was meant to avoid.
    expect(useThree).toBe(useThreeCore)
    expect(useFrame).toBe(useFrameCore)
  })
})
