/**
 * @fileoverview Ownership and teardown for useRenderPipeline (Tier 1, no GPU).
 *
 * A call with a callback owns the canvas's pipeline and frees it when it unmounts; a call without
 * callbacks only reads. Release is deferred a task so StrictMode and Fast Refresh remounts reuse
 * the graph. Owners stack: the most recently mounted renders, the previous one takes over again.
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three/webgpu'

import { createStore, context } from './store'
import { useRenderPipeline, useUniforms } from '../src'
import { releaseAllOwners } from '../src/internal/renderPipelineOwners'
import type { RootStore } from '@react-three/fiber'

type Api = ReturnType<typeof useRenderPipeline>

function makeStore() {
  const store = createStore(
    () => {},
    () => {},
  )
  // A near-bare renderer is enough: the pipeline stores the reference and touches no GPU until
  // render() (Tier 2). The brand is what the hook narrows the renderer union on.
  const renderer = { isWebGPURenderer: true } as any
  store.setState({ scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), renderer, isLegacy: false } as any)
  return store
}

function mount(store: RootStore, children: React.ReactNode, strict = false) {
  const tree = <context.Provider value={store}>{children}</context.Provider>
  return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree)
}

/** Let the deferred release (one task) fire. */
const flushRelease = () => act(async () => new Promise((resolve) => setTimeout(resolve)))

function Owner({ onMain, persist, apiRef }: { onMain?: () => void; persist?: boolean; apiRef?: { current: Api } }) {
  const api = useRenderPipeline(() => onMain?.(), undefined, { persist })
  if (apiRef) apiRef.current = api
  return null
}

function Reader({ apiRef }: { apiRef: { current: Api } }) {
  apiRef.current = useRenderPipeline()
  return null
}

describe('useRenderPipeline ownership', () => {
  afterEach(() => vi.restoreAllMocks())

  it('a reader never creates a pipeline', async () => {
    const store = makeStore()
    const reader = { current: null! as Api }
    await act(async () => mount(store, <Reader apiRef={reader} />))

    expect(store.getState().renderPipeline ?? null).toBeNull()
    expect(store.getState().internal.renderOverride ?? null).toBeNull()
    expect(reader.current.isReady).toBe(false)
  })

  it('a reader sees the owner pipeline, and unmounting it leaves the pipeline intact', async () => {
    const store = makeStore()
    const reader = { current: null! as Api }
    let rerender!: (ui: React.ReactElement) => void
    await act(async () => {
      ;({ rerender } = mount(
        store,
        <>
          <Owner />
          <Reader apiRef={reader} />
        </>,
      ))
    })
    const pipeline = store.getState().renderPipeline!
    expect(reader.current.renderPipeline).toBe(pipeline)
    const disposeSpy = vi.spyOn(pipeline, 'dispose')

    await act(async () =>
      rerender(
        <context.Provider value={store}>
          <Owner />
        </context.Provider>,
      ),
    )
    await flushRelease()

    expect(store.getState().renderPipeline).toBe(pipeline)
    expect(disposeSpy).not.toHaveBeenCalled()
  })

  it('unmounting the owner frees its pipeline and scenePass and goes back to plain rendering', async () => {
    const store = makeStore()
    let unmount!: () => void
    await act(async () => {
      ;({ unmount } = mount(store, <Owner />))
    })
    const pipeline = store.getState().renderPipeline!
    const scenePass = store.getState().passes!.scenePass!
    const pipelineDispose = vi.spyOn(pipeline, 'dispose')
    const passDispose = vi.spyOn(scenePass, 'dispose')

    // Synchronous act: an async one waits a task, which would let the deferred release fire
    act(() => unmount())
    // Deferred: nothing is freed in the cleanup itself, so a remount could still claim it
    expect(pipelineDispose).not.toHaveBeenCalled()

    await flushRelease()
    expect(pipelineDispose).toHaveBeenCalledTimes(1)
    expect(passDispose).toHaveBeenCalledTimes(1)
    expect(store.getState().renderPipeline).toBeNull()
    expect(store.getState().passes).toEqual({})
    expect(store.getState().internal.renderOverride).toBeNull()
  })

  it('StrictMode: callbacks run once and the remount reuses the graph', async () => {
    const store = makeStore()
    const onMain = vi.fn()
    await act(async () => mount(store, <Owner onMain={onMain} />, true))
    await flushRelease()

    expect(onMain).toHaveBeenCalledTimes(1)
    const pipeline = store.getState().renderPipeline!
    expect(pipeline).toBeInstanceOf(THREE.RenderPipeline)
    expect(pipeline.outputNode).toBe(store.getState().passes!.scenePass)
  })

  it('the most recently mounted owner renders; the previous one takes over again with its graph', async () => {
    const store = makeStore()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let rerender!: (ui: React.ReactElement) => void
    await act(async () => {
      ;({ rerender } = mount(store, <Owner key="a" />))
    })
    const first = store.getState().renderPipeline!
    const firstDispose = vi.spyOn(first, 'dispose')

    await act(async () =>
      rerender(
        <context.Provider value={store}>
          <Owner key="a" />
          <Owner key="b" />
        </context.Provider>,
      ),
    )
    const second = store.getState().renderPipeline!
    expect(second).not.toBe(first)
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/More than one mounted component/))
    const secondDispose = vi.spyOn(second, 'dispose')

    await act(async () =>
      rerender(
        <context.Provider value={store}>
          <Owner key="a" />
        </context.Provider>,
      ),
    )
    await flushRelease()

    expect(store.getState().renderPipeline).toBe(first)
    expect(secondDispose).toHaveBeenCalledTimes(1)
    expect(firstDispose).not.toHaveBeenCalled()
  })

  it('swapping one owner for another in a single commit does not warn and frees the old one', async () => {
    const store = makeStore()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let rerender!: (ui: React.ReactElement) => void
    await act(async () => {
      ;({ rerender } = mount(store, <Owner key="bloom" />))
    })
    const old = store.getState().renderPipeline!
    const oldDispose = vi.spyOn(old, 'dispose')

    await act(async () =>
      rerender(
        <context.Provider value={store}>
          <Owner key="blur" />
        </context.Provider>,
      ),
    )
    await flushRelease()

    expect(store.getState().renderPipeline).not.toBe(old)
    expect(store.getState().renderPipeline).toBeInstanceOf(THREE.RenderPipeline)
    expect(oldDispose).toHaveBeenCalledTimes(1)
    expect(warn).not.toHaveBeenCalled()
  })

  it('persist keeps the pipeline after unmount until reset(), which a reader can call', async () => {
    const store = makeStore()
    const reader = { current: null! as Api }
    let rerender!: (ui: React.ReactElement) => void
    await act(async () => {
      ;({ rerender } = mount(
        store,
        <>
          <Owner persist />
          <Reader apiRef={reader} />
        </>,
      ))
    })
    const pipeline = store.getState().renderPipeline!
    const disposeSpy = vi.spyOn(pipeline, 'dispose')

    await act(async () =>
      rerender(
        <context.Provider value={store}>
          <Reader apiRef={reader} />
        </context.Provider>,
      ),
    )
    await flushRelease()
    expect(store.getState().renderPipeline).toBe(pipeline)
    expect(disposeSpy).not.toHaveBeenCalled()

    await act(async () => reader.current.reset())
    expect(disposeSpy).toHaveBeenCalledTimes(1)
    expect(store.getState().renderPipeline).toBeNull()
  })

  it('canvas unmount frees a persisted pipeline', async () => {
    const store = makeStore()
    let unmount!: () => void
    await act(async () => {
      ;({ unmount } = mount(store, <Owner persist />))
    })
    const disposeSpy = vi.spyOn(store.getState().renderPipeline!, 'dispose')
    await act(async () => unmount())

    // What the TSL root extension's dispose runs when the canvas unmounts
    releaseAllOwners(store)
    expect(disposeSpy).toHaveBeenCalledTimes(1)
  })

  it('a hot update re-runs the callbacks on the same scenePass and recompiles', async () => {
    const store = makeStore()
    const onMain = vi.fn()
    await act(async () => mount(store, <Owner onMain={onMain} />))
    const scenePass = store.getState().passes!.scenePass!
    const passDispose = vi.spyOn(scenePass, 'dispose')
    const pipeline = store.getState().renderPipeline!
    pipeline.needsUpdate = false

    await act(async () => store.setState((s) => ({ _hmrVersion: s._hmrVersion + 1 })))

    expect(onMain).toHaveBeenCalledTimes(2)
    expect(store.getState().passes!.scenePass).toBe(scenePass)
    expect(passDispose).not.toHaveBeenCalled()
    expect(pipeline.needsUpdate).toBe(true)
  })

  it("a reader's rebuild() rebuilds the owner that is rendering", async () => {
    const store = makeStore()
    const onMain = vi.fn()
    const reader = { current: null! as Api }
    await act(async () =>
      mount(
        store,
        <>
          <Owner onMain={onMain} />
          <Reader apiRef={reader} />
        </>,
      ),
    )
    const firstPass = store.getState().passes!.scenePass

    await act(async () => reader.current.rebuild())

    expect(onMain).toHaveBeenCalledTimes(2)
    expect(store.getState().passes!.scenePass).not.toBe(firstPass)
  })

  //* Tracked reads (as in useLocalNodes) ==============================

  it('sees a uniform its parent registers, and rebuilds on the same scenePass when it lands', async () => {
    const store = makeStore()
    const seen: unknown[] = []
    function Pipeline() {
      useRenderPipeline(({ uniforms }) => {
        seen.push(uniforms.blurAmount)
      })
      return null
    }
    function Parent() {
      // Registered in the parent's layout effect, which React runs after the child's
      useUniforms({ blurAmount: 1 })
      return <Pipeline />
    }
    await act(async () => mount(store, <Parent />))

    const uniform = store.getState().uniforms.blurAmount
    expect(uniform).toBeDefined()
    expect(seen.at(-1)).toBe(uniform)
    expect(store.getState().passes!.scenePass).toBeDefined()
  })

  it('a registration the callbacks did not read does not re-run them', async () => {
    const store = makeStore()
    const onMain = vi.fn()
    function Pipeline() {
      useRenderPipeline(({ uniforms }) => {
        onMain(uniforms.blurAmount)
      })
      return null
    }
    let rerender!: (ui: React.ReactElement) => void
    function Unrelated() {
      useUniforms({ somethingElse: 2 })
      return null
    }
    function Blur() {
      useUniforms({ blurAmount: 1 })
      return null
    }
    await act(async () => {
      ;({ rerender } = mount(
        store,
        <>
          <Blur />
          <Pipeline />
        </>,
      ))
    })
    const runs = onMain.mock.calls.length

    await act(async () =>
      rerender(
        <context.Provider value={store}>
          <Blur />
          <Pipeline />
          <Unrelated />
        </context.Provider>,
      ),
    )

    expect(store.getState().uniforms.somethingElse).toBeDefined()
    expect(onMain).toHaveBeenCalledTimes(runs)
  })

  it('re-runs on the same scenePass when a uniform it read appears later', async () => {
    const store = makeStore()
    const seen: unknown[] = []
    function Pipeline() {
      useRenderPipeline(({ uniforms }) => {
        // .has() probes without the missing-read path; the plain read is what gets tracked
        seen.push(uniforms.has('late') ? uniforms.late : undefined)
      })
      return null
    }
    function Late() {
      useUniforms({ late: 1 })
      return null
    }
    let rerender!: (ui: React.ReactElement) => void
    await act(async () => {
      ;({ rerender } = mount(store, <Pipeline />))
    })
    expect(seen).toEqual([undefined])
    const scenePass = store.getState().passes!.scenePass

    await act(async () =>
      rerender(
        <context.Provider value={store}>
          <Pipeline />
          <Late />
        </context.Provider>,
      ),
    )

    expect(seen).toHaveLength(2)
    expect(seen[1]).toBe(store.getState().uniforms.late)
    expect(store.getState().passes!.scenePass).toBe(scenePass)
  })
})
