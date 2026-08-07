/**
 * @fileoverview Tier-1 coverage for the core `useRenderTarget` hook.
 *
 * `useRenderTarget` is a CORE hook, but its whole reason to exist is the
 * per-entry WebGL-vs-WebGPU render-target distinction, so it lives here beside
 * the WebGPU suite. Under the test `#three` alias both build flags are true
 * (default build), so the hook takes its runtime branch:
 *
 *     isLegacy ? new WebGLRenderTarget(...) : new RenderTarget(...)
 *
 * Constructing a render target does NOT touch the GPU (no device needed), so
 * argument parsing, the isLegacy type split, sizing from the store, memoization,
 * and disposal are all fully provable in jsdom (Tier 1). Actually *rendering into*
 * a target is Tier 2.
 *
 * Tiers are defined in `docs/development/TESTING.md`. In short: Tier 1 runs on every PR and
 * proves wiring; Tier 2 needs a real GPU and runs as a pre-release gate. An `it.todo('covered
 * by Tier 2: …')` marks something jsdom structurally cannot prove, rather than a hollow
 * assertion that would look like coverage.
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import { RenderTarget } from 'three/webgpu'
import { WebGLRenderTarget, PerspectiveCamera } from 'three'

import { createStore, context } from '../../src/core/store'
import { useRenderTarget } from '../../src'
import type { RootStore } from '../../src'

const noop = () => {}
const makeStore = () => createStore(noop, noop)

function withStore(store: RootStore, children: React.ReactNode) {
  return render(<context.Provider value={store}>{children}</context.Provider>)
}

/**
 * Seed a canvas size and the renderer kind the hook branches on.
 * A size change fires the store's resize subscriber, which recomputes the
 * viewport against `camera` and calls `internal.actualRenderer.setSize`, so we
 * provide a real camera and a stub renderer to keep that path happy in jsdom.
 */
function seed(store: RootStore, size: { width: number; height: number }, isLegacy = false) {
  const state = store.getState()
  store.setState({
    camera: new PerspectiveCamera(),
    size: { ...size, top: 0, left: 0 },
    isLegacy,
    internal: { ...state.internal, actualRenderer: { setSize() {}, setPixelRatio() {} } },
  } as any)
}

describe('useRenderTarget', () => {
  it('WebGPU (isLegacy=false): returns a three/webgpu RenderTarget sized to the canvas', async () => {
    const store = makeStore()
    seed(store, { width: 800, height: 600 }, false)
    let fbo: any
    function Comp() {
      fbo = useRenderTarget()
      return null
    }
    await act(async () => withStore(store, <Comp />))

    expect(fbo).toBeInstanceOf(RenderTarget)
    expect(fbo).not.toBeInstanceOf(WebGLRenderTarget)
    expect(fbo.width).toBe(800)
    expect(fbo.height).toBe(600)
  })

  it('Legacy (isLegacy=true): returns a WebGLRenderTarget', async () => {
    const store = makeStore()
    seed(store, { width: 320, height: 240 }, true)
    let fbo: any
    function Comp() {
      fbo = useRenderTarget()
      return null
    }
    await act(async () => withStore(store, <Comp />))

    expect(fbo).toBeInstanceOf(WebGLRenderTarget)
    expect(fbo.width).toBe(320)
    expect(fbo.height).toBe(240)
  })

  it('single number arg -> square target', async () => {
    const store = makeStore()
    seed(store, { width: 800, height: 600 })
    let fbo: any
    function Comp() {
      fbo = useRenderTarget(512)
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(fbo.width).toBe(512)
    expect(fbo.height).toBe(512)
  })

  it('two number args -> explicit width/height', async () => {
    const store = makeStore()
    seed(store, { width: 800, height: 600 })
    let fbo: any
    function Comp() {
      fbo = useRenderTarget(512, 256)
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(fbo.width).toBe(512)
    expect(fbo.height).toBe(256)
  })

  it('options-only arg -> canvas size + options forwarded to the target', async () => {
    const store = makeStore()
    seed(store, { width: 640, height: 480 })
    let fbo: any
    function Comp() {
      fbo = useRenderTarget({ samples: 4 })
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(fbo.width).toBe(640)
    expect(fbo.height).toBe(480)
    expect(fbo.samples).toBe(4)
  })

  it('memoized: stable across re-renders, re-created when the canvas size changes', async () => {
    const store = makeStore()
    seed(store, { width: 800, height: 600 })
    let fbo: any
    let renders = 0
    function Comp() {
      fbo = useRenderTarget()
      renders++
      return null
    }
    let r!: ReturnType<typeof withStore>
    await act(async () => {
      r = withStore(store, <Comp />)
    })
    const first = fbo

    // Re-render with unchanged size -> same instance (memoized)
    await act(async () => {
      r.rerender(
        <context.Provider value={store}>
          <Comp />
        </context.Provider>,
      )
    })
    expect(fbo).toBe(first)

    // Change the canvas size -> new target instance
    await act(async () => {
      store.setState({ size: { width: 1024, height: 768, top: 0, left: 0 } } as any)
    })
    expect(fbo).not.toBe(first)
    expect(fbo.width).toBe(1024)
    expect(renders).toBeGreaterThan(1)
  })

  it('disposal: the returned target exposes dispose() and releases without error', async () => {
    const store = makeStore()
    seed(store, { width: 256, height: 256 })
    let fbo: any
    function Comp() {
      fbo = useRenderTarget()
      return null
    }
    await act(async () => withStore(store, <Comp />))

    expect(typeof fbo.dispose).toBe('function')
    expect(() => fbo.dispose()).not.toThrow()
  })

  // Rendering a scene into the target and reading pixels back needs a real device.
  it.todo('covered by Tier 2: rendering into the target produces correct texture output')
})
