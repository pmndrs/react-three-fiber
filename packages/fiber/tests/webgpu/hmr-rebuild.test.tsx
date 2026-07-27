/**
 * @fileoverview HMR rebuild correctness for the TSL resource hooks (C16).
 *
 * Browser validation C16 found that Vite hot updates corrupt TSL state: the
 * rebuilt scene reuses stale scoped nodes and React reports setState-during-
 * render from the creator hooks. Full audit ("the plan" below):
 * https://app.notion.com/p/3aa0baf6021681829f5ddb5129d40430
 *
 * These tests pin the INTENDED semantics (plan §5) and are written red-first
 * against the defects (plan §3):
 *   D1 — creator hooks must not write to the store during render
 *   D2 — `useUniforms` must not mutate store state in place
 *   D3 — cache reuse must not resurrect entries from a previous generation
 *
 * "HMR" here is simulated exactly as the Canvas listener performs it
 * (`core/Canvas.tsx`): `clearHmrCaches(store)` — wipe all four maps and bump
 * `_hmrVersion`. jsdom cannot run Vite, but the store transition is identical,
 * so everything except the vite event plumbing is covered at this tier.
 * The browser protocol in plan §6 covers the rest.
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import { color, float } from 'three/tsl'
import { createStore, context } from '../../src/core/store'
import { clearHmrCaches } from '../../src/core/utils/hmr'
import { useNodes, useUniforms } from '../../src/webgpu'
import type { RootStore } from '../../src'

const noop = () => {}
const makeStore = () => createStore(noop, noop)

/** Render `children` with `useStore()` resolving to the given store. */
function withStore(store: RootStore, children: React.ReactNode) {
  return render(<context.Provider value={store}>{children}</context.Provider>)
}

/**
 * A creator component + a separately-mounted reader component, the shape that
 * broke in the browser (RagingSea's `Experience` + `SeaSurface`). The reader
 * records every value it COMMITS (post-render effect), not just renders —
 * intermediate renders React throws away are legal; committed corruption is not.
 */
function makeCreatorReaderPair(scope: string) {
  const committed: Array<Record<string, unknown>> = []

  function Creator({ make }: { make: () => Record<string, any> }) {
    useNodes(make, scope)
    return null
  }

  function Reader() {
    const nodes = useNodes(scope)
    // Strip the attached utils so assertions see only the node entries
    const { removeNodes, clearNodes, rebuildNodes, ...entries } = nodes
    React.useEffect(() => {
      committed.push(entries)
    })
    return null
  }

  return { Creator, Reader, committed }
}

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(noop)
})

afterEach(() => {
  errorSpy.mockRestore()
})

/** React logs cross-component render-phase setState through console.error. */
function renderPhaseViolations() {
  return errorSpy.mock.calls.filter((args: unknown[]) => String(args[0]).includes('Cannot update a component'))
}

describe('TSL HMR rebuild (C16) — creator + mounted reader', () => {
  it('T1: never triggers setState-during-render, on mount or across a simulated hot update', async () => {
    const store = makeStore()
    const { Creator, Reader } = makeCreatorReaderPair('sea')
    const make = () => ({ tint: color('#ff0a81') })

    // Reader first, creator second — the order that guarantees a subscribed
    // reader exists while the creator's registration runs (RagingSea's shape).
    await act(async () => {
      withStore(
        store,
        <>
          <Reader />
          <Creator make={make} />
        </>,
      )
    })

    await act(async () => clearHmrCaches(store))

    expect(renderPhaseViolations()).toEqual([])
  })

  it('T2: a committed reader value is never empty once the scope has been populated (atomic rebuild)', async () => {
    const store = makeStore()
    const { Creator, Reader, committed } = makeCreatorReaderPair('sea')
    const make = () => ({ tint: color('#ff0a81') })

    await act(async () => {
      withStore(
        store,
        <>
          <Reader />
          <Creator make={make} />
        </>,
      )
    })

    await act(async () => clearHmrCaches(store))

    // The reader must land on the rebuilt generation…
    const final = committed.at(-1)!
    expect(Object.keys(final)).toEqual(['tint'])
    // …and once populated, no later COMMIT may observe the scope empty.
    // (old-complete → new-complete is the only legal transition, plan §5.3)
    const firstPopulated = committed.findIndex((c) => Object.keys(c).length > 0)
    const emptyAfterPopulated = committed.slice(firstPopulated).filter((c) => Object.keys(c).length === 0)
    expect(emptyAfterPopulated).toEqual([])
  })

  it('T3: after a hot update, nodes are rebuilt against the SAME generation of uniforms (no stale capture)', async () => {
    const store = makeStore()

    // RagingSea's dependency shape: a uniform creator plus a node creator that
    // derives from the uniform via the CreatorState proxy.
    function Experience() {
      useUniforms({ uEmissive: color('#ff0a81') }, 'sea')
      useNodes(({ uniforms }) => ({ emissive: (uniforms as any).sea.uEmissive }), 'sea')
      return null
    }
    let seen: Record<string, any> = {}
    function Surface() {
      seen = useNodes('sea')
      return null
    }

    await act(async () => {
      withStore(
        store,
        <>
          <Surface />
          <Experience />
        </>,
      )
    })

    await act(async () => clearHmrCaches(store))

    // The node the reader received must BE the uniform currently in the store —
    // not a captured reference to the wiped generation (plan H2/D3).
    const current = (store.getState().uniforms.sea as any).uEmissive
    expect(current).toBeDefined()
    expect(seen.emissive).toBe(current)
  })

  it('T4: scoped uniform creation does not mutate a previous state snapshot in place', async () => {
    const store = makeStore()
    const before = store.getState().uniforms

    function Comp() {
      useUniforms({ uHealth: float(100) }, 'player')
      return null
    }
    await act(async () => withStore(store, <Comp />))

    // The pre-mount uniforms object must be untouched: new scopes arrive via
    // an immutable state transition, never by writing into the old object (D2).
    expect(Object.keys(before)).toEqual([])
    expect(store.getState().uniforms).not.toBe(before)
    expect((store.getState().uniforms.player as any).uHealth).toBeDefined()
  })

  it('T5: StrictMode double-render registers one generation, no duplicates and no violations', async () => {
    const store = makeStore()
    const { Creator, Reader } = makeCreatorReaderPair('fx')
    const make = () => ({ pulse: float(1) })

    await act(async () => {
      withStore(
        store,
        <React.StrictMode>
          <Reader />
          <Creator make={make} />
        </React.StrictMode>,
      )
    })

    const scope = store.getState().nodes.fx as Record<string, unknown>
    expect(Object.keys(scope)).toEqual(['pulse'])
    expect(renderPhaseViolations()).toEqual([])
  })

  it('T6: with a shared primaryStore, a hot update on the primary rebuilds atomically for the secondary reader', async () => {
    const primary = makeStore()
    const secondary = makeStore()
    secondary.setState({ primaryStore: primary })

    // Creator lives on the primary canvas, reader on the secondary (A6 shape).
    function Creator() {
      useNodes(() => ({ shared: float(42) }), 'sea')
      return null
    }
    let seen: Record<string, any> = {}
    function Reader() {
      seen = useNodes('sea')
      return null
    }

    await act(async () => {
      withStore(secondary, <Reader />)
      withStore(primary, <Creator />)
    })
    expect(seen.shared).toBeDefined()

    await act(async () => clearHmrCaches(primary))

    // Secondary's reader must see the primary's rebuilt generation.
    expect(seen.shared).toBe((primary.getState().nodes.sea as any).shared)
    expect(renderPhaseViolations()).toEqual([])
  })

  it('T7: rebuildNodes(scope) re-creates only that scope, leaving others untouched (existing semantics)', async () => {
    const store = makeStore()
    let utils!: ReturnType<typeof useNodes>

    function Comp() {
      useNodes(() => ({ a: float(1) }), 'alpha')
      utils = useNodes(() => ({ b: float(2) }), 'beta')
      return null
    }
    await act(async () => withStore(store, <Comp />))

    const alphaBefore = store.getState().nodes.alpha
    const betaBefore = store.getState().nodes.beta

    await act(async () => utils.rebuildNodes('beta'))

    expect(store.getState().nodes.alpha).toBe(alphaBefore)
    expect(store.getState().nodes.beta).toBeDefined()
    expect(store.getState().nodes.beta).not.toBe(betaBefore)
  })

  it('T8: when the creator function itself changes across a hot update, the new creator wins', async () => {
    const store = makeStore()
    const { Creator, Reader } = makeCreatorReaderPair('sea')

    const oldTint = color('#ff0a81')
    const newTint = color('#00d5ff')

    const { rerender } = withStore(
      store,
      <>
        <Reader />
        <Creator make={() => ({ tint: oldTint })} />
      </>,
    )
    await act(async () => {})
    expect((store.getState().nodes.sea as any).tint).toBe(oldTint)

    // A hot update swaps the module: new creator closure + cache wipe. The
    // edited creator's output must replace the cached entry (C16's trigger).
    await act(async () => {
      clearHmrCaches(store)
      rerender(
        <context.Provider value={store}>
          <Reader />
          <Creator make={() => ({ tint: newTint })} />
        </context.Provider>,
      )
    })

    expect((store.getState().nodes.sea as any).tint).toBe(newTint)
  })
})
