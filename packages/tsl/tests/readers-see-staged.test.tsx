/**
 * @fileoverview Reader hooks see entries a parent registered earlier in the SAME render.
 *
 * Registration is two-phase: a creator stages its entries during render and a commit-phase layout
 * effect flushes them onto the store. A child renders before any flush (and its layout effects run
 * before its parent's), so a reader that returned only the committed map got `undefined` on its
 * first render for anything its parent declared. The motion-blur demo baked that `undefined` into
 * its render pipeline (`velocity * null` in WGSL). Readers now overlay staged entries the way
 * creators already did.
 *
 * Every assertion that matters here is on the FIRST render's return value, not after commit.
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three/webgpu'
import { float, instancedArray } from 'three/tsl'

import type { RootStore } from '@react-three/fiber/webgpu'
import { useBuffers, useGPUStorage, useNodes, useUniform, useUniforms } from '../src'
import { createStore, context } from './store'

const noop = () => {}
const makeStore = () => createStore(noop, noop)

let warnSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(noop)
})
afterEach(() => warnSpy.mockRestore())

async function mount(store: RootStore, children: React.ReactNode, strict = false) {
  const tree = <context.Provider value={store}>{children}</context.Provider>
  let view: ReturnType<typeof render> = null!
  await act(async () => {
    view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree)
  })
  return view
}

/** Records what each render of a reader returned, in order. */
function recorder<T>() {
  const renders: T[] = []
  return { renders, first: () => renders[0], last: () => renders[renders.length - 1] }
}

//* useUniforms ==============================

describe('useUniforms readers see staged uniforms', () => {
  it('useUniforms() sees a uniform its parent registered in the same first render', async () => {
    const store = makeStore()
    const created = recorder<UniformNode>()
    const read = recorder<UniformNode | undefined>()

    function Child() {
      read.renders.push(useUniforms<{ uSpeed: number }>().uSpeed)
      return null
    }
    function Parent() {
      created.renders.push(useUniforms({ uSpeed: 2 }).uSpeed)
      return <Child />
    }

    await mount(store, <Parent />)

    expect(read.first()).toBeDefined()
    expect(read.first()).toBe(created.first())
    // After commit the reader holds the committed node, which is the same node
    expect(read.last()).toBe(store.getState().uniforms.uSpeed)
    expect(read.last()).toBe(created.first())
  })

  it("useUniforms('scope') sees a scoped uniform its parent registered in the same first render", async () => {
    const store = makeStore()
    const created = recorder<UniformNode>()
    const read = recorder<UniformNode | undefined>()

    function Child() {
      read.renders.push(useUniforms<{ uHealth: number }>('player').uHealth)
      return null
    }
    function Parent() {
      created.renders.push(useUniforms({ uHealth: 100 }, 'player').uHealth)
      return <Child />
    }

    await mount(store, <Parent />)

    expect(read.first()).toBeDefined()
    expect(read.first()).toBe(created.first())
    expect(read.last()).toBe((store.getState().uniforms.player as Record<string, UniformNode>).uHealth)
  })

  it('useUniforms() merges a staged scope over its committed entries', async () => {
    const store = makeStore()
    function Existing() {
      useUniforms({ uOld: 1 }, 'fx')
      return null
    }
    const view = await mount(store, <Existing />)
    const committedOld = (store.getState().uniforms.fx as Record<string, UniformNode>).uOld

    const read = recorder<Record<string, UniformNode> | undefined>()
    function Child() {
      read.renders.push(useUniforms().fx as Record<string, UniformNode> | undefined)
      return null
    }
    function Parent() {
      useUniforms({ uNew: 2 }, 'fx')
      return <Child />
    }
    await act(async () => {
      view.rerender(
        <context.Provider value={store}>
          <Existing />
          <Parent />
        </context.Provider>,
      )
    })

    expect(read.first()?.uOld).toBe(committedOld)
    expect(read.first()?.uNew).toBeDefined()
    expect(read.first()?.uNew).toBe((store.getState().uniforms.fx as Record<string, UniformNode>).uNew)
  })

  it('returns the committed scope objects themselves when nothing is staged', async () => {
    const store = makeStore()
    const read = recorder<unknown>()
    function Creator() {
      useUniforms({ uA: 1 }, 'fx')
      return null
    }
    function Reader() {
      read.renders.push(useUniforms().fx)
      return null
    }
    const view = await mount(store, <Creator />)

    await act(async () => {
      view.rerender(
        <context.Provider value={store}>
          <Creator />
          <Reader />
        </context.Provider>,
      )
    })

    // Nothing was staged for the reader's render: no overlay copy, the committed object as-is
    expect(read.first()).toBe(store.getState().uniforms.fx)
  })

  it('still updates reactively when another component registers later', async () => {
    const store = makeStore()
    const read = recorder<UniformNode | undefined>()
    function Reader() {
      read.renders.push(useUniforms<{ uLate: number }>().uLate)
      return null
    }
    function Late() {
      useUniforms({ uLate: 7 })
      return null
    }

    const view = await mount(store, <Reader />)
    expect(read.last()).toBeUndefined()

    await act(async () => {
      view.rerender(
        <context.Provider value={store}>
          <Reader />
          <Late />
        </context.Provider>,
      )
    })

    expect(read.last()).toBeDefined()
    expect(read.last()).toBe(store.getState().uniforms.uLate)
  })

  it('works under StrictMode', async () => {
    const store = makeStore()
    const created = recorder<UniformNode>()
    const read = recorder<UniformNode | undefined>()
    const scoped = recorder<UniformNode | undefined>()

    function Child() {
      read.renders.push(useUniforms<{ uSpeed: number }>().uSpeed)
      scoped.renders.push(useUniforms<{ uHealth: number }>('player').uHealth)
      return null
    }
    function Parent() {
      created.renders.push(useUniforms({ uSpeed: 2 }).uSpeed)
      useUniforms({ uHealth: 100 }, 'player')
      return <Child />
    }

    await mount(store, <Parent />, true)

    expect(read.renders.every((node) => node !== undefined)).toBe(true)
    expect(scoped.renders.every((node) => node !== undefined)).toBe(true)
    // StrictMode's double render reuses the staged node: one node, everywhere
    expect(new Set(created.renders).size).toBe(1)
    expect(new Set(read.renders)).toEqual(new Set(created.renders))
    expect(read.last()).toBe(store.getState().uniforms.uSpeed)
  })
})

//* useUniform (read-only form) ==============================

describe('useUniform(name) sees a staged uniform', () => {
  it("returns a uniform its parent registered in the same render instead of throwing 'not found'", async () => {
    const store = makeStore()
    const created = recorder<UniformNode>()
    const read = recorder<UniformNode>()

    function Child() {
      read.renders.push(useUniform('uGlow'))
      return null
    }
    function Parent() {
      created.renders.push(useUniforms({ uGlow: 0.5 }).uGlow)
      return <Child />
    }

    await mount(store, <Parent />)

    expect(read.first()).toBe(created.first())
    expect(read.last()).toBe(store.getState().uniforms.uGlow)
  })
})

//* useNodes ==============================

describe('useNodes readers see staged nodes', () => {
  it('useNodes() and useNodes(scope) see nodes their parent registered in the same first render', async () => {
    const store = makeStore()
    const created = recorder<{ wobble: unknown; offset: unknown }>()
    const root = recorder<unknown>()
    const scoped = recorder<unknown>()
    const nested = recorder<unknown>()

    function Child() {
      const all = useNodes()
      root.renders.push(all.wobble)
      nested.renders.push((all.player as Record<string, unknown> | undefined)?.offset)
      scoped.renders.push(useNodes('player').offset)
      return null
    }
    function Parent() {
      const { wobble } = useNodes(() => ({ wobble: float(1) }))
      const { offset } = useNodes(() => ({ offset: float(2) }), 'player')
      created.renders.push({ wobble, offset })
      return <Child />
    }

    await mount(store, <Parent />)

    expect(root.first()).toBeDefined()
    expect(root.first()).toBe(created.first().wobble)
    expect(scoped.first()).toBe(created.first().offset)
    expect(nested.first()).toBe(created.first().offset)
    expect(root.last()).toBe(store.getState().nodes.wobble)
    expect(scoped.last()).toBe((store.getState().nodes.player as Record<string, unknown>).offset)
  })
})

//* useBuffers / useGPUStorage ==============================

describe('useBuffers and useGPUStorage readers see staged entries', () => {
  it('useBuffers() and useBuffers(scope) see buffers their parent registered in the same first render', async () => {
    const store = makeStore()
    const positions = new Float32Array(4)
    const velocities = instancedArray(4, 'vec2')
    const root = recorder<unknown>()
    const scoped = recorder<unknown>()

    function Child() {
      root.renders.push(useBuffers().positions)
      scoped.renders.push(useBuffers('particles').velocities)
      return null
    }
    function Parent() {
      useBuffers(() => ({ positions }))
      useBuffers(() => ({ velocities }), 'particles')
      return <Child />
    }

    await mount(store, <Parent />)

    expect(root.first()).toBe(positions)
    expect(scoped.first()).toBe(velocities)
    expect(root.last()).toBe(store.getState().buffers.positions)
  })

  it('useGPUStorage() and useGPUStorage(scope) see storage their parent registered in the same first render', async () => {
    const store = makeStore()
    const heightMap = new THREE.StorageTexture(8, 8)
    const normal = new THREE.StorageTexture(8, 8)
    const root = recorder<unknown>()
    const scoped = recorder<unknown>()

    function Child() {
      root.renders.push(useGPUStorage().heightMap)
      scoped.renders.push(useGPUStorage('terrain').normal)
      return null
    }
    function Parent() {
      useGPUStorage(() => ({ heightMap }))
      useGPUStorage(() => ({ normal }), 'terrain')
      return <Child />
    }

    await mount(store, <Parent />)

    expect(root.first()).toBe(heightMap)
    expect(scoped.first()).toBe(normal)
    expect(scoped.last()).toBe((store.getState().gpuStorage.terrain as Record<string, unknown>).normal)
  })
})

//* Motion-blur regression ==============================

describe('motion-blur shape: a child captures a parent uniform into something built in a layout effect', () => {
  // WebGPUMotionBlur: Experience registers `blurAmount`, RenderPipelineManager reads it with
  // useUniforms() and closes over it in a pipeline built during commit. The child's layout effect
  // runs BEFORE the parent's flush, so whatever the first render returned is what gets baked in.
  it('captures the uniform node, not undefined', async () => {
    const store = makeStore()
    const captured: unknown[] = []
    let registered: UniformNode | null = null

    function RenderPipelineManager() {
      const { blurAmount } = useUniforms<{ blurAmount: number }>()
      React.useLayoutEffect(() => {
        // Built once, like a render pipeline graph
        captured.push(blurAmount)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])
      return null
    }
    function Experience() {
      registered = useUniforms({ blurAmount: 1 }).blurAmount
      return <RenderPipelineManager />
    }

    await mount(store, <Experience />)

    expect(captured).toHaveLength(1)
    expect(captured[0]).toBeDefined()
    expect(captured[0]).toBe(registered)
    expect(captured[0]).toBe(store.getState().uniforms.blurAmount)
  })
})
