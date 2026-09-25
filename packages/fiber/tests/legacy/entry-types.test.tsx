/**
 * Legacy entry type narrowing — compile-time guard, the `/legacy` twin of
 * `tests/webgpu/entry-types.test.tsx`.
 *
 * The assertions that matter here are checked by `tsc`, not by vitest: the repo's tsconfig
 * includes `packages/**\/*`, so `pnpm typecheck` compiles this file on every CI run and a
 * regression in the entry's declared types fails the build. `typeAssertions()` is deliberately
 * never called — its body only has to *compile*.
 *
 * The entry exports `LegacyRootState as RootState`, but `useThree`/`useFrame` came from the star
 * re-export of `../core` and were typed against the base RootState, whose `renderer` is the
 * R3FRenderer union (WebGPURenderer included). So `useThree((s) => s.renderer)` could not be used
 * as a WebGLRenderer without a cast, even though this entry only ever creates one — and the
 * exported `RootState` type did not match what the hooks actually handed back.
 *
 * The runtime test below pins the other half of the contract: this is a types-only narrowing,
 * so the exported values must still be the core implementations.
 */
import type { WebGLRenderer } from 'three'

import { useThree, useFrame, Canvas } from '../../src/legacy'
import { useThree as useThreeCore, useFrame as useFrameCore } from '../../src/core'
import { Canvas as CanvasCore } from '../../src/core/Canvas'
import type { RootState as LegacyRootState } from '../../src/legacy'

/** Never invoked — this exists so `tsc` checks the bodies. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function typeAssertions() {
  // useThree: the selected renderer is a WebGLRenderer, no cast.
  const renderer: WebGLRenderer = useThree((s) => s.renderer)
  // WebGL-only members must resolve.
  renderer.shadowMap.enabled = true
  void renderer.getContext

  // useThree with no selector hands back the narrowed state — the same type the entry exports.
  const state: LegacyRootState = useThree()
  const fromState: WebGLRenderer = state.renderer

  // useFrame's callback state is narrowed the same way.
  useFrame((frameState) => {
    const frameRenderer: WebGLRenderer = frameState.renderer
    frameRenderer.shadowMap.needsUpdate = true
    void frameState.delta
  })

  // onCreated receives the narrowed state too.
  void (
    <Canvas
      onCreated={(created) => {
        const createdRenderer: WebGLRenderer = created.renderer
        void createdRenderer
      }}
    />
  )

  // A selector returning something other than the renderer still infers normally.
  const width: number = useThree((s) => s.size.width)

  void [renderer, state, fromState, width]
}

describe('legacy entry: narrowed state hooks', () => {
  it('re-exports the core implementations unchanged (types-only narrowing)', () => {
    // If these ever diverge, the entry has grown a second code path to keep in sync — which is
    // exactly what re-typing rather than wrapping was meant to avoid.
    expect(useThree).toBe(useThreeCore)
    expect(useFrame).toBe(useFrameCore)
    expect(Canvas).toBe(CanvasCore)
  })
})
