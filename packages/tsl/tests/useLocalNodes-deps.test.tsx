/**
 * @fileoverview Dependency-array semantics for `useLocalNodes` (#3918, part 1 of #3888).
 *
 * The contract under test:
 *
 * | Call                             | Component-render behavior                                   |
 * | -------------------------------- | ----------------------------------------------------------- |
 * | `useLocalNodes(creator)`         | Re-evaluate on every render (even with a stable callback)   |
 * | `useLocalNodes(creator, [])`     | Reuse across ordinary renders                               |
 * | `useLocalNodes(creator, [a, b])` | Reuse until a declared dependency changes by `Object.is`    |
 *
 * In every mode a registered-resource replacement, a change of owning store, and an HMR /
 * manual invalidation remain independent rebuild triggers, and the creator used for any
 * evaluation is the one belonging to the current render.
 *
 * Every test records creator EXECUTIONS and node IDENTITY separately, and the material test
 * records material identity as a third metric — the three are not the same thing (a creator
 * can run without changing identity; identity can change without remounting a material).
 * Actual GPU recompilation needs a device and is a Tier-2 concern (see `it.todo`).
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three/webgpu'
import { color, float } from 'three/tsl'
import type { Node as TSLNode } from 'three/webgpu'

import { createRoot, type RootStore } from '@react-three/fiber/webgpu'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'
import { useLocalNodes, useUniforms, rebuildAllNodes, type LocalNodeCreator } from '../src'
import { clearHmrCaches } from '../src/internal/hmr'
import { createStore, context } from './store'

const noop = () => {}
const makeStore = () => createStore(noop, noop)

/** Render `children` with `useStore()` resolving to the given store. */
function withStore(store: RootStore, children: React.ReactNode) {
  return render(<context.Provider value={store}>{children}</context.Provider>)
}

/** Registers one uniform in an unrelated scope — the "unrelated registration" from #3888. */
function RegisterUnrelated() {
  useUniforms({ uUnrelated: 1 }, 'unrelated-scope')
  return null
}

/**
 * A probe that records every creator execution and the identity of the node it returned on
 * each render. `deps` is forwarded verbatim, so `undefined` means the no-array call.
 */
function makeProbe() {
  const log = { runs: 0, results: [] as Array<{ tag: string; node: unknown }> }

  function Probe({
    tag = 'a',
    deps,
    creator,
  }: {
    tag?: string
    deps?: React.DependencyList
    creator?: LocalNodeCreator<{ node: unknown; tag: string }>
  }) {
    const fallback: LocalNodeCreator<{ node: unknown; tag: string }> = () => {
      log.runs++
      return { node: float(1), tag }
    }
    const result = useLocalNodes(creator ?? fallback, deps)
    log.results.push(result)
    return null
  }

  return { Probe, log }
}

let errorSpy: ReturnType<typeof spyConsole>
let warnSpy: ReturnType<typeof spyConsole>

const spyConsole = (method: 'error' | 'warn') => vi.spyOn(console, method).mockImplementation(noop)

beforeEach(() => {
  errorSpy = spyConsole('error')
  warnSpy = spyConsole('warn')
})

afterEach(() => {
  errorSpy.mockRestore()
  warnSpy.mockRestore()
})

const lastResult = <T,>(results: T[]) => results[results.length - 1]

//* Explicit dependency mode ==============================

describe('useLocalNodes — explicit dependency array', () => {
  it('[] with an inline creator: keeps the result and node identity across unrelated parent and local-state renders', async () => {
    const store = makeStore()
    const { Probe, log } = makeProbe()
    let setLocal: React.Dispatch<React.SetStateAction<number>> = noop

    function Parent({ unrelated }: { unrelated: number }) {
      const [local, set] = React.useState(0)
      setLocal = set
      return <Probe tag={`${unrelated}:${local}`} deps={[]} />
    }

    const view = withStore(store, <Parent unrelated={0} />)
    await act(async () => {})
    const first = lastResult(log.results)
    expect(log.runs).toBe(1)

    // Unrelated parent prop change
    await act(async () => view.rerender(<context.Provider value={store}>{<Parent unrelated={1} />}</context.Provider>))
    // Unrelated local state change
    await act(async () => setLocal(1))
    await act(async () => setLocal(2))

    expect(log.runs).toBe(1)
    expect(lastResult(log.results)).toBe(first)
    expect(lastResult(log.results).node).toBe(first.node)
  })

  it('[strength]: reconstructs only when strength changes by Object.is', async () => {
    const store = makeStore()
    const { Probe, log } = makeProbe()

    const tree = (strength: number, other: number) => (
      <context.Provider value={store}>
        <Probe tag={`s${strength}`} deps={[strength]} />
        <span>{other}</span>
      </context.Provider>
    )

    const view = render(tree(1, 0))
    await act(async () => {})
    const first = lastResult(log.results)
    expect(log.runs).toBe(1)

    // Same strength, different unrelated prop: reused
    await act(async () => view.rerender(tree(1, 1)))
    expect(log.runs).toBe(1)
    expect(lastResult(log.results)).toBe(first)

    // Strength changed: rebuilt, new identity
    await act(async () => view.rerender(tree(2, 1)))
    expect(log.runs).toBe(2)
    const second = lastResult(log.results)
    expect(second).not.toBe(first)
    expect(second.node).not.toBe(first.node)
    expect(second.tag).toBe('s2')

    // NaN is equal to itself under Object.is: no rebuild on a NaN → NaN "change"
    await act(async () => view.rerender(tree(NaN, 1)))
    expect(log.runs).toBe(3)
    await act(async () => view.rerender(tree(NaN, 2)))
    expect(log.runs).toBe(3)
  })

  it("[] does not use creator identity as a rebuild trigger, but a legitimate rebuild uses the CURRENT render's creator", async () => {
    const store = makeStore()
    const { Probe, log } = makeProbe()

    const tree = (tag: string, extra?: React.ReactNode) => (
      <context.Provider value={store}>
        <Probe tag={tag} deps={[]} />
        {extra}
      </context.Provider>
    )

    const view = render(tree('a'))
    await act(async () => {})
    expect(lastResult(log.results).tag).toBe('a')

    // A new inline creator each render capturing 'b' — not a declared dep, so no rebuild
    await act(async () => view.rerender(tree('b')))
    expect(log.runs).toBe(1)
    expect(lastResult(log.results).tag).toBe('a')

    // Registering a resource is an independent rebuild trigger; the rebuilt result must come
    // from the creator of the render that performed it (captures 'b'), not the first one.
    await act(async () => view.rerender(tree('b', <RegisterUnrelated />)))
    expect(log.runs).toBeGreaterThanOrEqual(2)
    expect(lastResult(log.results).tag).toBe('b')
  })

  it('[] : a registered-resource replacement reconstructs (whole-map subscription until #3919)', async () => {
    const store = makeStore()
    const { Probe, log } = makeProbe()

    const view = withStore(store, <Probe deps={[]} />)
    await act(async () => {})
    const first = lastResult(log.results)
    const runsBefore = log.runs

    await act(async () =>
      view.rerender(
        <context.Provider value={store}>
          <Probe deps={[]} />
          <RegisterUnrelated />
        </context.Provider>,
      ),
    )

    expect(store.getState().uniforms['unrelated-scope']).toBeDefined()
    expect(log.runs).toBeGreaterThan(runsBefore)
    expect(lastResult(log.results).node).not.toBe(first.node)
  })

  it("[] : a change of owning store reconstructs using the current render's creator", async () => {
    const storeA = makeStore()
    const storeB = makeStore()
    const { Probe, log } = makeProbe()

    const tree = (store: RootStore, tag: string) => (
      <context.Provider value={store}>
        <Probe tag={tag} deps={[]} />
      </context.Provider>
    )

    const view = render(tree(storeA, 'a'))
    await act(async () => {})
    const first = lastResult(log.results)
    expect(log.runs).toBe(1)

    await act(async () => view.rerender(tree(storeB, 'b')))
    expect(log.runs).toBe(2)
    expect(lastResult(log.results)).not.toBe(first)
    expect(lastResult(log.results).tag).toBe('b')
  })

  it("[] : updating an existing uniform's .value does not rebuild", async () => {
    const store = makeStore()
    let runs = 0
    let uStrength: UniformNode<number> | null = null
    let seen: { scaled: unknown } | null = null

    function Comp({ tick }: { tick: number }) {
      const u = useUniforms({ uStrength: 1 })
      uStrength = u.uStrength
      seen = useLocalNodes(({ uniforms }) => {
        runs++
        return { scaled: (uniforms.uStrength as UniformNode<number>).mul(2) }
      }, [])
      return <span>{tick}</span>
    }

    const view = withStore(store, <Comp tick={0} />)
    await act(async () => {})
    // Mount: initial render + the re-render caused by the uniform landing on the store.
    const runsAfterMount = runs
    const nodeAfterMount = seen!.scaled

    // A live value mutation is a Three/TSL concern: the graph references the node, it does not
    // capture the value, so neither the mutation nor the following render rebuilds anything.
    await act(async () => {
      uStrength!.value = 5
    })
    await act(async () => view.rerender(<context.Provider value={store}>{<Comp tick={1} />}</context.Provider>))

    expect(uStrength!.value).toBe(5)
    expect(runs).toBe(runsAfterMount)
    expect(seen!.scaled).toBe(nodeAfterMount)
  })

  it('[] : HMR invalidation still reconstructs the composition', async () => {
    const store = makeStore()
    const { Probe, log } = makeProbe()

    withStore(store, <Probe deps={[]} />)
    await act(async () => {})
    const first = lastResult(log.results)
    expect(log.runs).toBe(1)

    await act(async () => clearHmrCaches(store))

    expect(log.runs).toBe(2)
    expect(lastResult(log.results)).not.toBe(first)
    expect(lastResult(log.results).node).not.toBe(first.node)
  })

  it('[strength] : manual rebuildAllNodes() still reconstructs the composition', async () => {
    const store = makeStore()
    const { Probe, log } = makeProbe()

    withStore(store, <Probe deps={[1]} />)
    await act(async () => {})
    const first = lastResult(log.results)
    expect(log.runs).toBe(1)

    await act(async () => rebuildAllNodes(store))

    expect(log.runs).toBe(2)
    expect(lastResult(log.results).node).not.toBe(first.node)
  })

  it('[] : sees resources STAGED earlier in the same render (createLazyCreatorState overlay is preserved)', async () => {
    const store = makeStore()
    let seen: { ref: unknown } | null = null

    function Comp() {
      useUniforms({ uStaged: 3 }, 'stage')
      seen = useLocalNodes(({ uniforms }) => ({ ref: uniforms.scope('stage').uStaged }), [])
      return null
    }

    // Assert on the FIRST render's view — before the commit-phase flush lands on the store.
    let firstRenderRef: unknown = Symbol('unset')
    function Capture() {
      const r = React.useRef(true)
      if (r.current) {
        r.current = false
        firstRenderRef = seen?.ref
      }
      return null
    }

    await act(async () =>
      withStore(
        store,
        <>
          <Comp />
          <Capture />
        </>,
      ),
    )

    expect(firstRenderRef).toBeDefined()
    expect((firstRenderRef as UniformNode<number>).value).toBe(3)
  })
})

//* No-array mode ==============================

describe('useLocalNodes — no dependency array', () => {
  it('re-evaluates on every component render with an inline creator', async () => {
    const store = makeStore()
    const { Probe, log } = makeProbe()

    const view = withStore(store, <Probe />)
    await act(async () => {})
    const runsAfterMount = log.runs
    const first = lastResult(log.results)

    await act(async () => view.rerender(<context.Provider value={store}>{<Probe tag="b" />}</context.Provider>))

    expect(log.runs).toBe(runsAfterMount + 1)
    expect(lastResult(log.results)).not.toBe(first)
    expect(lastResult(log.results).tag).toBe('b')
  })

  it('re-evaluates on every component render even when the creator is a stable useCallback (documented behavior change)', async () => {
    const store = makeStore()
    let runs = 0
    const results: Array<{ node: unknown }> = []

    function Comp({ tick }: { tick: number }) {
      const creator = React.useCallback<LocalNodeCreator<{ node: unknown }>>(() => {
        runs++
        return { node: float(1) }
      }, [])
      results.push(useLocalNodes(creator))
      return <span>{tick}</span>
    }

    const view = withStore(store, <Comp tick={0} />)
    await act(async () => {})
    const runsAfterMount = runs
    const first = lastResult(results)

    await act(async () => view.rerender(<context.Provider value={store}>{<Comp tick={1} />}</context.Provider>))

    expect(runs).toBe(runsAfterMount + 1)
    expect(lastResult(results).node).not.toBe(first.node)
  })
})

//* Lifecycle robustness ==============================

describe('useLocalNodes — StrictMode, unmount/remount', () => {
  it('StrictMode: the committed result is valid and stable, with no render-phase violations', async () => {
    const store = makeStore()
    const { Probe, log } = makeProbe()
    const committed: Array<{ node: unknown }> = []

    function Recorder() {
      React.useEffect(() => {
        committed.push(lastResult(log.results))
      })
      return null
    }

    const tree = (tag: string) => (
      <React.StrictMode>
        <context.Provider value={store}>
          <Probe tag={tag} deps={[]} />
          <Recorder />
        </context.Provider>
      </React.StrictMode>
    )

    const view = render(tree('a'))
    await act(async () => {})
    // StrictMode double-invokes render; exactly-once execution is NOT part of the contract.
    expect(log.runs).toBeGreaterThanOrEqual(1)
    const first = committed[committed.length - 1]
    expect(first.node).toBeDefined()

    await act(async () => view.rerender(tree('b')))
    const second = committed[committed.length - 1]
    expect(second.node).toBe(first.node)

    expect(errorSpy.mock.calls.filter((c) => String(c[0]).includes('Cannot update a component'))).toEqual([])
  })

  it('unmount/remount: the remounted instance builds a fresh, valid result and never publishes to the store', async () => {
    const store = makeStore()
    const { Probe, log } = makeProbe()

    const view = withStore(store, <Probe deps={[]} />)
    await act(async () => {})
    const first = lastResult(log.results)

    await act(async () => view.rerender(<context.Provider value={store}>{null}</context.Provider>))
    await act(async () => view.rerender(<context.Provider value={store}>{<Probe deps={[]} />}</context.Provider>))

    const remounted = lastResult(log.results)
    expect(remounted.node).toBeDefined()
    expect(remounted.node).not.toBe(first.node)
    // useLocalNodes is component-local: nothing lands on the shared maps in any mode.
    expect(Object.keys(store.getState().nodes)).toEqual([])
  })
})

describe('useLocalNodes — discarded concurrent renders', () => {
  // The dependency record is a ref written during render, so a render React throws away still
  // leaves its list behind. These pin that the committed result always matches the committed deps:
  // a discarded render may cost one extra evaluation, never a stale value.
  function setup() {
    const store = makeStore()
    const runs: string[] = []
    const built = new Map<unknown, string>()
    const committed: Array<{ tag: string; node: unknown }> = []
    const pending = { promise: null as Promise<void> | null, resolve: noop }
    let setValue: (value: string) => void = noop

    function Suspender({ value }: { value: string }) {
      if (value === 'b' && pending.promise) React.use(pending.promise)
      return null
    }

    function Child({ value }: { value: string }) {
      const result = useLocalNodes(() => {
        runs.push(value)
        const node = float(value.charCodeAt(0))
        built.set(node, value)
        return { tag: value, node }
      }, [value])
      React.useLayoutEffect(() => void committed.push(result))
      return null
    }

    function Parent() {
      const [value, set] = React.useState('a')
      setValue = set
      return (
        <React.Suspense fallback={null}>
          <Child value={value} />
          <Suspender value={value} />
        </React.Suspense>
      )
    }

    pending.promise = new Promise<void>((resolve) => (pending.resolve = resolve))
    return { store, runs, built, committed, pending, Parent, set: (value: string) => setValue(value) }
  }

  it('a transition to [b] that suspends and is then superseded by [a] commits the a result', async () => {
    const { store, runs, built, committed, Parent, set } = setup()
    withStore(store, <Parent />)
    await act(async () => {})
    const first = lastResult(committed)
    expect(first.tag).toBe('a')

    // Rendered with [b], suspended, and never committed: the ref now holds [b]
    await act(async () => React.startTransition(() => set('b')))
    expect(runs).toContain('b')
    expect(lastResult(committed)).toBe(first)

    // Back to [a] before b ever commits
    await act(async () => set('a'))
    const final = lastResult(committed)
    expect(final.tag).toBe('a')
    expect(built.get(final.node)).toBe('a')
  })

  it('a transition to [b] that suspends and later resolves commits the b result', async () => {
    const { store, built, committed, pending, Parent, set } = setup()
    withStore(store, <Parent />)
    await act(async () => {})

    await act(async () => React.startTransition(() => set('b')))
    expect(lastResult(committed).tag).toBe('a')

    await act(async () => {
      pending.promise = null
      pending.resolve()
    })
    const final = lastResult(committed)
    expect(final.tag).toBe('b')
    expect(built.get(final.node)).toBe('b')
  })
})

//* Development diagnostics ==============================

describe('useLocalNodes — dependency list diagnostics', () => {
  it('warns once when the dependency array length changes between renders', async () => {
    const store = makeStore()
    const { Probe } = makeProbe()

    const view = withStore(store, <Probe deps={[1]} />)
    await act(async () => {})
    expect(warnSpy).not.toHaveBeenCalled()

    await act(async () => view.rerender(<context.Provider value={store}>{<Probe deps={[1, 2]} />}</context.Provider>))
    const lengthWarnings = () =>
      warnSpy.mock.calls.filter((c) => String(c[0]).includes('useLocalNodes') && String(c[0]).includes('length'))
    expect(lengthWarnings()).toHaveLength(1)

    // Same shape again: no repeated warning for a stable list
    await act(async () => view.rerender(<context.Provider value={store}>{<Probe deps={[1, 2]} />}</context.Provider>))
    expect(lengthWarnings()).toHaveLength(1)
  })

  it('warns when the dependency array is added or removed between renders', async () => {
    const store = makeStore()
    const { Probe } = makeProbe()

    const view = withStore(store, <Probe deps={[]} />)
    await act(async () => {})

    await act(async () => view.rerender(<context.Provider value={store}>{<Probe />}</context.Provider>))
    const presenceWarnings = warnSpy.mock.calls.filter(
      (c) => String(c[0]).includes('useLocalNodes') && String(c[0]).includes('omitted'),
    )
    expect(presenceWarnings.length).toBeGreaterThanOrEqual(1)
  })
})

//* Metrics are distinct: node identity vs material remount ==============================

describe('useLocalNodes — node identity is not material identity', () => {
  it('a dependency change swaps the node but updates the material in place; unrelated renders change neither', async () => {
    const canvas = createCanvas()
    const root = createRoot(canvas)
    let runs = 0
    let seenNode: unknown = null

    function Mat({ strength, tick }: { strength: number; tick: number }) {
      const { colorNode } = useLocalNodes(() => {
        runs++
        return { colorNode: color('#ff0000').mul(strength) }
      }, [strength])
      seenNode = colorNode
      return (
        <mesh userData={{ tick }}>
          <boxGeometry />
          <meshBasicNodeMaterial colorNode={colorNode} />
        </mesh>
      )
    }

    const store = await act(async () =>
      (await root.configure({ frameloop: 'never' })).render(<Mat strength={1} tick={0} />),
    )
    const mesh = () => store.getState().scene.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh
    const material0 = mesh().material
    const node0 = seenNode
    const runs0 = runs
    expect(material0).toBeInstanceOf(THREE.MeshBasicNodeMaterial)

    // Unrelated prop: creator not run, node identity kept, material instance kept
    await act(async () => root.render(<Mat strength={1} tick={1} />))
    expect(runs).toBe(runs0)
    expect(seenNode).toBe(node0)
    expect(mesh().material).toBe(material0)

    // Declared dep change: creator ran, node identity changed, material NOT remounted
    await act(async () => root.render(<Mat strength={2} tick={1} />))
    expect(runs).toBe(runs0 + 1)
    expect(seenNode).not.toBe(node0)
    expect(mesh().material).toBe(material0)
    expect((mesh().material as THREE.MeshBasicNodeMaterial).colorNode).toBe(seenNode)

    await act(async () => root.unmount())
  })

  it.todo('covered by Tier 2: whether a swapped colorNode triggers a GPU pipeline recompile needs a real device')
})

//* Types (compile-time; checked by `pnpm typecheck`) ==============================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function typeAssertions() {
  const readonlyDeps: readonly [number, string] = [1, 'a'] as const
  const local = useLocalNodes(() => ({ a: float(1), b: 'text' as const }), readonlyDeps)
  const a: TSLNode<'float'> = local.a
  const b: 'text' = local.b
  void a
  void b
  // @ts-expect-error exact creator return keys are preserved: no `missing` key
  local.missing

  // A mutable array and no array are both accepted
  useLocalNodes(() => ({ n: float(1) }), [1, 2])
  useLocalNodes(() => ({ n: float(1) }))
  // An explicit undefined is the no-array call
  useLocalNodes(() => ({ n: float(1) }), undefined)
}
