/**
 * @fileoverview Tier-1 lifecycle coverage for the WebGPU/TSL hooks.
 *
 * These tests drive the TSL resource hooks (useUniforms, useNodes, useBuffers,
 * useGPUStorage) and useRenderPipeline against a raw store + React context —
 * NO real GPU device. jsdom cannot execute WebGPU, so every assertion here is
 * about LIFECYCLE + STORE WIRING (create / update / dispose / rebuild), mirroring
 * the store-driven approach in `primaryStore.test.tsx`.
 *
 * What is proven here (Tier 1, guarded on every PR):
 *   - create: mounting registers the resource on the (primary) store
 *   - update: re-rendering a uniform mutates the existing node in place (GPU-only)
 *   - dispose/remove: the returned utils release GPU objects and drop the store key
 *   - rebuild: rebuildX()/rebuildAllX()/_hmrVersion clears + re-creates the resource
 *   - useRenderPipeline: mounting builds a render pipeline on the store and
 *     wires the `renderPipeline.render` delegation hook the render loop reads
 *
 * What is NOT proven here (see `it.todo` — Tier 2, real GPU only):
 *   - that uniform/node value changes actually reach the compiled shader
 *   - that the render loop's `state.renderPipeline.render()` produces correct output
 *   These need a device; faking them in jsdom would be a hollow assertion.
 *
 * Tiers are defined in `docs/development/TESTING.md`. In short: Tier 1 runs on every PR and
 * proves wiring; Tier 2 needs a real GPU and runs as a pre-release gate. An `it.todo('covered
 * by Tier 2: …')` marks something jsdom structurally cannot prove, rather than a hollow
 * assertion that would look like coverage.
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three/webgpu'
import { color, vec3, float, instancedArray } from 'three/tsl'

import { createStore, context } from '../../src/core/store'
import {
  useUniforms,
  rebuildAllUniforms,
  useNodes,
  useLocalNodes,
  rebuildAllNodes,
  useBuffers,
  useGPUStorage,
  useRenderPipeline,
} from '../../src/webgpu'
import type { RootStore } from '../../src'

const noop = () => {}
const makeStore = () => createStore(noop, noop)

/** Render `children` with `useStore()` resolving to the given store. */
function withStore(store: RootStore, children: React.ReactNode) {
  return render(<context.Provider value={store}>{children}</context.Provider>)
}

/** Error boundary that captures a thrown error from a child effect/render. */
function makeBoundary() {
  const ref: { error: Error | null } = { error: null }
  class Boundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false }
    static getDerivedStateFromError() {
      return { hasError: true }
    }
    componentDidCatch(error: Error) {
      ref.error = error
    }
    render() {
      return this.state.hasError ? null : this.props.children
    }
  }
  return { Boundary, ref }
}

//* useUniforms ==============================

describe('useUniforms — lifecycle against the store', () => {
  it('create: mounting registers uniform nodes on the (primary) store', async () => {
    const store = makeStore()
    function Comp() {
      useUniforms({ uTime: 0, uColor: '#ff0000' })
      return null
    }
    await act(async () => withStore(store, <Comp />))

    const { uniforms } = store.getState()
    expect(uniforms.uTime).toBeDefined()
    expect((uniforms.uTime as any).value).toBe(0)
    // string colors are vectorized into a THREE.Color-valued uniform
    expect(uniforms.uColor).toBeDefined()
    expect((uniforms.uColor as any).value).toBeInstanceOf(THREE.Color)
  })

  it('create (scoped): stores under state.uniforms[scope] without leaking to root', async () => {
    const store = makeStore()
    function Comp() {
      useUniforms({ uHealth: 100 }, 'player')
      return null
    }
    await act(async () => withStore(store, <Comp />))

    const { uniforms } = store.getState()
    expect((uniforms.player as any).uHealth.value).toBe(100)
    expect(uniforms.uHealth).toBeUndefined()
  })

  it('update: re-rendering a changed value mutates the SAME node in place (no churn)', async () => {
    const store = makeStore()
    function Comp({ t }: { t: number }) {
      useUniforms({ uTime: t })
      return null
    }
    let r!: ReturnType<typeof withStore>
    await act(async () => {
      r = withStore(store, <Comp t={0} />)
    })
    const node0 = store.getState().uniforms.uTime as any
    expect(node0.value).toBe(0)

    await act(async () => {
      r.rerender(
        <context.Provider value={store}>
          <Comp t={5} />
        </context.Provider>,
      )
    })
    const node1 = store.getState().uniforms.uTime as any
    expect(node1).toBe(node0) // identity preserved -> GPU-only update, no new store entry
    expect(node1.value).toBe(5)
  })

  it('remove/clear utils: drop keys from the store', async () => {
    const store = makeStore()
    let api!: ReturnType<typeof useUniforms>
    function Comp() {
      api = useUniforms({ uA: 1, uB: 2 })
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(store.getState().uniforms.uA).toBeDefined()

    await act(async () => api.removeUniforms('uA'))
    expect(store.getState().uniforms.uA).toBeUndefined()
    expect(store.getState().uniforms.uB).toBeDefined()

    await act(async () => api.clearUniforms())
    expect(Object.keys(store.getState().uniforms)).toHaveLength(0)
  })

  it('rebuild: rebuildUniforms() clears the cache, bumps _hmrVersion, and re-creates', async () => {
    const store = makeStore()
    let api!: ReturnType<typeof useUniforms>
    function Comp() {
      api = useUniforms({ uTime: 0 })
      return null
    }
    await act(async () => withStore(store, <Comp />))
    const node0 = store.getState().uniforms.uTime as any
    const version0 = store.getState()._hmrVersion

    await act(async () => api.rebuildUniforms())

    const node1 = store.getState().uniforms.uTime as any
    expect(store.getState()._hmrVersion).toBe(version0 + 1)
    expect(node1).toBeDefined() // re-created after clear
    expect(node1).not.toBe(node0) // fresh node identity
  })

  it('rebuildAllUniforms (standalone HMR entry): clears + bumps _hmrVersion on the store', async () => {
    const store = makeStore()
    function Comp() {
      useUniforms({ uTime: 0 })
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(store.getState().uniforms.uTime).toBeDefined()
    const version0 = store.getState()._hmrVersion

    await act(async () => rebuildAllUniforms(store))

    expect(store.getState()._hmrVersion).toBe(version0 + 1)
    // creator not re-mounted in this test, so the cleared key stays cleared
    expect(store.getState().uniforms.uTime).toBeDefined() // re-mounted via subscription
  })

  // Real value propagation to the compiled shader needs a device.
  it.todo('covered by Tier 2: uniform .value changes reach the GPU shader on the next frame')
})

//* useNodes / useLocalNodes ==============================

describe('useNodes — lifecycle against the store', () => {
  it('create (root): registers TSL nodes on state.nodes', async () => {
    const store = makeStore()
    function Comp() {
      useNodes(() => ({ colorNode: color('#00ff00'), floatNode: float(1) }))
      return null
    }
    await act(async () => withStore(store, <Comp />))

    const { nodes } = store.getState()
    expect(nodes.colorNode).toBeDefined()
    expect(nodes.floatNode).toBeDefined()
  })

  it('create (scoped): registers under state.nodes[scope]', async () => {
    const store = makeStore()
    function Comp() {
      useNodes(() => ({ n: vec3(1, 2, 3) }), 'fx')
      return null
    }
    await act(async () => withStore(store, <Comp />))

    expect((store.getState().nodes.fx as any).n).toBeDefined()
    expect(store.getState().nodes.n).toBeUndefined()
  })

  it('reader mode: useNodes(scope) reflects the scoped nodes reactively', async () => {
    const store = makeStore()
    let seen: any
    function Comp() {
      useNodes(() => ({ n: float(7) }), 'fx')
      seen = useNodes('fx')
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(seen.n).toBeDefined()
  })

  it('remove/clear utils drop node keys', async () => {
    const store = makeStore()
    let api!: ReturnType<typeof useNodes>
    function Comp() {
      api = useNodes(() => ({ a: float(1), b: float(2) }))
      return null
    }
    await act(async () => withStore(store, <Comp />))

    await act(async () => api.removeNodes('a'))
    expect(store.getState().nodes.a).toBeUndefined()
    expect(store.getState().nodes.b).toBeDefined()

    await act(async () => api.clearNodes())
    expect(Object.keys(store.getState().nodes)).toHaveLength(0)
  })

  it('rebuild: rebuildNodes() clears + bumps _hmrVersion and re-creates fresh nodes', async () => {
    const store = makeStore()
    let api!: ReturnType<typeof useNodes>
    function Comp() {
      api = useNodes(() => ({ n: float(1) }))
      return null
    }
    await act(async () => withStore(store, <Comp />))
    const node0 = store.getState().nodes.n
    const version0 = store.getState()._hmrVersion

    await act(async () => api.rebuildNodes())

    expect(store.getState()._hmrVersion).toBe(version0 + 1)
    expect(store.getState().nodes.n).toBeDefined()
    expect(store.getState().nodes.n).not.toBe(node0)
  })

  it('rebuildAllNodes (standalone): clears root nodes + bumps _hmrVersion', async () => {
    const store = makeStore()
    function Comp() {
      useNodes(() => ({ n: float(1) }))
      return null
    }
    await act(async () => withStore(store, <Comp />))
    const version0 = store.getState()._hmrVersion
    await act(async () => rebuildAllNodes(store))
    expect(store.getState()._hmrVersion).toBe(version0 + 1)
  })

  it('useLocalNodes: does NOT register in the global store (component-local only)', async () => {
    const store = makeStore()
    let local: any
    function Comp() {
      local = useLocalNodes(() => ({ localNode: color('#ff00ff') }))
      return null
    }
    await act(async () => withStore(store, <Comp />))

    expect(local.localNode).toBeDefined()
    expect(store.getState().nodes.localNode).toBeUndefined()
  })
})

//* useBuffers ==============================

describe('useBuffers — lifecycle against the store', () => {
  it('create: registers TypedArrays / BufferAttributes / TSL buffer nodes', async () => {
    const store = makeStore()
    function Comp() {
      useBuffers(() => ({
        positions: instancedArray(8, 'vec3'),
        raw: new Float32Array(12),
        attr: new THREE.StorageBufferAttribute(new Float32Array(12), 3),
      }))
      return null
    }
    await act(async () => withStore(store, <Comp />))

    const { buffers } = store.getState()
    expect(buffers.positions).toBeDefined()
    expect(buffers.raw).toBeDefined()
    expect(buffers.attr).toBeDefined()
  })

  it('create (scoped): registers under state.buffers[scope]', async () => {
    const store = makeStore()
    function Comp() {
      useBuffers(() => ({ pos: instancedArray(4, 'vec2') }), 'particles')
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect((store.getState().buffers.particles as any).pos).toBeDefined()
  })

  it('dispose: disposeBuffers() releases GPU resources and removes the key', async () => {
    const store = makeStore()
    const buf = instancedArray(8, 'vec3') as any
    const disposeSpy = vi.spyOn(buf, 'dispose')
    // useBuffers is overloaded and BuffersWithUtils<T> is invariant in T, so a
    // specific-shape result won't assign to the wide no-arg overload type. The
    // runtime assertions don't need the static shape — widen the handle to any.
    let api!: any
    function Comp() {
      api = useBuffers(() => ({ positions: buf }))
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(store.getState().buffers.positions).toBe(buf)

    await act(async () => api.disposeBuffers('positions'))

    expect(disposeSpy).toHaveBeenCalledTimes(1)
    expect(store.getState().buffers.positions).toBeUndefined()
  })

  it('rebuild: rebuildBuffers() clears + bumps _hmrVersion and re-creates', async () => {
    const store = makeStore()
    // useBuffers is overloaded and BuffersWithUtils<T> is invariant in T, so a
    // specific-shape result won't assign to the wide no-arg overload type. The
    // runtime assertions don't need the static shape — widen the handle to any.
    let api!: any
    function Comp() {
      api = useBuffers(() => ({ positions: instancedArray(8, 'vec3') }))
      return null
    }
    await act(async () => withStore(store, <Comp />))
    const buf0 = store.getState().buffers.positions
    const version0 = store.getState()._hmrVersion

    await act(async () => api.rebuildBuffers())

    expect(store.getState()._hmrVersion).toBe(version0 + 1)
    expect(store.getState().buffers.positions).toBeDefined()
    expect(store.getState().buffers.positions).not.toBe(buf0)
  })
})

//* useGPUStorage ==============================

describe('useGPUStorage — lifecycle against the store', () => {
  it('create: registers StorageTexture on state.gpuStorage', async () => {
    const store = makeStore()
    function Comp() {
      useGPUStorage(() => ({ heightMap: new THREE.StorageTexture(64, 64) }))
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(store.getState().gpuStorage.heightMap).toBeDefined()
    expect((store.getState().gpuStorage.heightMap as any).isTexture).toBe(true)
  })

  it('create (scoped) + reader mode: reflects scoped storage', async () => {
    const store = makeStore()
    let seen: any
    function Comp() {
      useGPUStorage(() => ({ normal: new THREE.StorageTexture(32, 32) }), 'terrain')
      seen = useGPUStorage('terrain')
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect((store.getState().gpuStorage.terrain as any).normal).toBeDefined()
    expect(seen.normal).toBeDefined()
  })

  it('dispose: disposeStorage() releases the texture and removes the key', async () => {
    const store = makeStore()
    const tex = new THREE.StorageTexture(64, 64)
    const disposeSpy = vi.spyOn(tex, 'dispose')
    // useGPUStorage is overloaded and StorageWithUtils<T> is invariant in T, so a
    // specific-shape result won't assign to the wide no-arg overload type. The
    // runtime assertions don't need the static shape — widen the handle to any.
    let api!: any
    function Comp() {
      api = useGPUStorage(() => ({ heightMap: tex }))
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(store.getState().gpuStorage.heightMap).toBe(tex)

    await act(async () => api.disposeStorage('heightMap'))

    expect(disposeSpy).toHaveBeenCalledTimes(1)
    expect(store.getState().gpuStorage.heightMap).toBeUndefined()
  })

  it('rebuild: rebuildStorage() clears + bumps _hmrVersion and re-creates', async () => {
    const store = makeStore()
    // useGPUStorage is overloaded and StorageWithUtils<T> is invariant in T, so a
    // specific-shape result won't assign to the wide no-arg overload type. The
    // runtime assertions don't need the static shape — widen the handle to any.
    let api!: any
    function Comp() {
      api = useGPUStorage(() => ({ heightMap: new THREE.StorageTexture(64, 64) }))
      return null
    }
    await act(async () => withStore(store, <Comp />))
    const tex0 = store.getState().gpuStorage.heightMap
    const version0 = store.getState()._hmrVersion

    await act(async () => api.rebuildStorage())

    expect(store.getState()._hmrVersion).toBe(version0 + 1)
    expect(store.getState().gpuStorage.heightMap).toBeDefined()
    expect(store.getState().gpuStorage.heightMap).not.toBe(tex0)
  })
})

//* useRenderPipeline ==============================

describe('useRenderPipeline — pipeline wiring against the store', () => {
  /** Seed the store with the scene/camera/renderer the hook reads via useThree. */
  function seedRenderer(store: RootStore) {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()
    // A bare object is enough: the render pipeline only stores the renderer reference;
    // it does not touch the GPU until .render() (Tier 2).
    const renderer = {} as any
    store.setState({ scene, camera, renderer, isLegacy: false } as any)
    return { scene, camera, renderer }
  }

  it('create: mounting builds a render pipeline + default scenePass on the store', async () => {
    const store = makeStore()
    seedRenderer(store)
    let api!: ReturnType<typeof useRenderPipeline>
    function Comp() {
      api = useRenderPipeline(() => {})
      return null
    }
    await act(async () => withStore(store, <Comp />))

    const state = store.getState()
    expect(state.renderPipeline).toBeInstanceOf(THREE.RenderPipeline)
    // The render-loop delegation hook: renderer.tsx reads `state.renderPipeline?.render`.
    expect(typeof (state.renderPipeline as any).render).toBe('function')
    expect(state.passes.scenePass).toBeDefined()
    expect(api.isReady).toBe(true)
  })

  it('setupCB + mainCB run and their returned passes land on the store', async () => {
    const store = makeStore()
    const { scene, camera } = seedRenderer(store)
    let mainRan = false
    function Comp() {
      useRenderPipeline(
        () => {
          mainRan = true
          return { extraPass: (globalThis as any).__x ?? { marker: true } }
        },
        () => ({ setupPass: { marker: true } }),
      )
      return null
    }
    await act(async () => withStore(store, <Comp />))

    expect(mainRan).toBe(true)
    expect(store.getState().passes.setupPass).toBeDefined()
    expect(store.getState().passes.extraPass).toBeDefined()
    // scenePass still keyed off the seeded scene/camera
    expect(store.getState().passes.scenePass).toBeDefined()
    void scene
    void camera
  })

  it('reset(): tears the pipeline + passes back down to null/empty', async () => {
    const store = makeStore()
    seedRenderer(store)
    let api!: ReturnType<typeof useRenderPipeline>
    function Comp() {
      api = useRenderPipeline(() => {})
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(store.getState().renderPipeline).not.toBeNull()

    await act(async () => api.reset())

    expect(store.getState().renderPipeline).toBeNull()
    expect(store.getState().passes).toEqual({})
  })

  it('clearPasses(): empties passes without destroying the pipeline', async () => {
    const store = makeStore()
    seedRenderer(store)
    let api!: ReturnType<typeof useRenderPipeline>
    function Comp() {
      api = useRenderPipeline(() => {})
      return null
    }
    await act(async () => withStore(store, <Comp />))
    expect(store.getState().passes.scenePass).toBeDefined()

    await act(async () => api.clearPasses())

    expect(store.getState().passes).toEqual({})
    expect(store.getState().renderPipeline).not.toBeNull()
  })

  it('throws (via error boundary) when used with a legacy WebGL renderer', async () => {
    const store = makeStore()
    seedRenderer(store)
    store.setState({ isLegacy: true } as any)
    const { Boundary, ref } = makeBoundary()
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Comp() {
      useRenderPipeline(() => {})
      return null
    }
    await act(async () => {
      render(
        <context.Provider value={store}>
          <Boundary>
            <Comp />
          </Boundary>
        </context.Provider>,
      )
    })

    expect(ref.error?.message).toMatch(/only available with WebGPU/)
    errSpy.mockRestore()
  })

  //* rebuild(): recompile + disposal ==============================
  // Regressions for #3853 (rebuilds never reached the GPU) and #3854 (rebuilds leaked the
  // outgoing scenePass). Both are lifecycle-observable, so they belong in Tier 1: `needsUpdate`
  // is a plain boolean three reads in _update(), and dispose() is a plain method call.

  /** Mount the hook and hand back the api + store. */
  async function mountPipeline(mainCB: RenderPipelineMainCallback = () => {}) {
    const store = makeStore()
    seedRenderer(store)
    let api!: ReturnType<typeof useRenderPipeline>
    function Comp() {
      api = useRenderPipeline(mainCB)
      return null
    }
    await act(async () => withStore(store, <Comp />))
    return { store, api: () => api }
  }

  it('rebuild(): sets needsUpdate so the new output node actually recompiles', async () => {
    const { store, api } = await mountPipeline()
    const pipeline = store.getState().renderPipeline as any

    // Stand in for a frame having been rendered: three's _update() clears needsUpdate once it
    // has compiled the present-quad material. Without the fix it stays false forever after.
    pipeline.needsUpdate = false

    await act(async () => api().rebuild())

    expect(store.getState().renderPipeline).toBe(pipeline)
    expect(pipeline.needsUpdate).toBe(true)
  })

  it('rebuild(): disposes the replaced scenePass instead of stranding its render target', async () => {
    const { store, api } = await mountPipeline()
    const firstPass = store.getState().passes.scenePass as any
    const disposeSpy = vi.spyOn(firstPass, 'dispose')

    await act(async () => api().rebuild())

    const secondPass = store.getState().passes.scenePass as any
    expect(secondPass).not.toBe(firstPass)
    expect(disposeSpy).toHaveBeenCalledTimes(1)
  })

  it('rebuild(): repoints a default passthrough outputNode at the new scenePass', async () => {
    // With no mainCB assigning outputNode, the pipeline still references the pass being
    // replaced. Disposing it without repointing would leave the pipeline rendering a freed
    // render target -- worse than the leak being fixed.
    const { store, api } = await mountPipeline()
    const pipeline = store.getState().renderPipeline as any
    const firstPass = store.getState().passes.scenePass as any
    expect(pipeline.outputNode).toBe(firstPass)

    await act(async () => api().rebuild())

    const secondPass = store.getState().passes.scenePass as any
    expect(pipeline.outputNode).toBe(secondPass)
    expect(pipeline.outputNode).not.toBe(firstPass)
  })

  it('does not dispose the scenePass on a re-render that reuses it', async () => {
    const store = makeStore()
    seedRenderer(store)
    function Comp() {
      useRenderPipeline(() => {})
      return null
    }
    let rerender!: (ui: React.ReactElement) => void
    await act(async () => {
      ;({ rerender } = withStore(store, <Comp />))
    })
    const scenePass = store.getState().passes.scenePass as any
    const disposeSpy = vi.spyOn(scenePass, 'dispose')

    await act(async () =>
      rerender(
        <context.Provider value={store}>
          <Comp />
        </context.Provider>,
      ),
    )

    expect(store.getState().passes.scenePass).toBe(scenePass)
    expect(disposeSpy).not.toHaveBeenCalled()
  })

  it('reset(): disposes the scenePass it drops', async () => {
    const { store, api } = await mountPipeline()
    const scenePass = store.getState().passes.scenePass as any
    const disposeSpy = vi.spyOn(scenePass, 'dispose')

    await act(async () => api().reset())

    expect(disposeSpy).toHaveBeenCalledTimes(1)
    expect(store.getState().renderPipeline).toBeNull()
  })

  // The render loop actually calling state.renderPipeline.render() each frame,
  // and that call producing correct post-processed output, both need a real device.
  it.todo('covered by Tier 2: default render loop delegates to state.renderPipeline.render() each frame')
  it.todo('covered by Tier 2: renderPipeline / scenePass produce correct post-processed output')
  // Tier 1 proves needsUpdate flips; that the recompiled graph reaches the GPU needs a device.
  it.todo('covered by Tier 2: rebuild() output node change is visible in rendered output')
})
