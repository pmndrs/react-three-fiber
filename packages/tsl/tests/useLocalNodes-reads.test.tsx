/**
 * @fileoverview Tracked resource reads for `useLocalNodes` (#3919, part 2 of #3888).
 *
 * A creator re-runs only when a shared resource it READ changes: replaced, removed, or appearing
 * where it read nothing. Registrations it did not read cause neither a re-render nor a rebuild, and
 * writing `.value` on a uniform it read is not a change.
 *
 * Every test records creator RUNS, component RENDERS and result IDENTITY separately.
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three/webgpu'
import { float, uniform } from 'three/tsl'

import type { RootStore } from '@react-three/fiber/webgpu'
import { useLocalNodes, useNodes, useUniforms, type CreatorState } from '../src'
import { createStore, context } from './store'

const noop = () => {}
const makeStore = () => createStore(noop, noop)

let warnSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(noop)
})
afterEach(() => warnSpy.mockRestore())

/** Mount one `useLocalNodes` consumer and report runs, renders and the latest result. */
async function mountReader<T extends Record<string, unknown>>(
  store: RootStore,
  creator: (state: CreatorState) => T,
  deps: React.DependencyList | undefined = [],
) {
  const log = { runs: 0, renders: 0, result: null as T | null }
  function Reader() {
    log.renders++
    log.result = useLocalNodes((state) => {
      log.runs++
      return creator(state)
    }, deps)
    return null
  }
  const view = render(
    <context.Provider value={store}>
      <Reader />
    </context.Provider>,
  )
  await act(async () => {})
  return { log, view }
}

/** Replace entries on a resource map the way a registration does: a new map object. */
function patch(store: RootStore, kind: 'uniforms' | 'nodes' | 'buffers' | 'gpuStorage', entries: object) {
  act(() => store.setState((s) => ({ [kind]: { ...(s[kind] as object), ...entries } }) as never))
}

//* Unrelated changes ==============================

describe('useLocalNodes: unrelated changes', () => {
  it('ignores registrations and replacements the creator did not read', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { uRead: uniform(1) })
    const { log } = await mountReader(store, ({ uniforms }) => ({ node: uniforms.uRead }))
    const first = log.result!.node

    patch(store, 'uniforms', { uOther: uniform(2), fog: { uDensity: uniform(3) } })
    patch(store, 'nodes', { wobble: float(1) })
    // An unrelated RootState write: the store notifies, nothing the creator read changed
    act(() => store.setState({ controls: { unrelated: true } as never }))

    expect(log.runs).toBe(1)
    expect(log.renders).toBe(1)
    expect(log.result!.node).toBe(first)
  })

  it('reads of two leaves in a scope are unaffected by a change to a third', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { fog: { uNear: uniform(1), uFar: uniform(2), uColor: uniform(3) } })
    const { log } = await mountReader(store, ({ uniforms }) => {
      const fog = uniforms.scope('fog')
      return { near: fog.uNear, far: fog.uFar }
    })

    const fog = store.getState().uniforms.fog as Record<string, unknown>
    patch(store, 'uniforms', { fog: { ...fog, uColor: uniform(4) } })

    expect(log.runs).toBe(1)
    expect(log.renders).toBe(1)
  })

  it('does not rebuild when a uniform it read has its .value written', async () => {
    const store = makeStore()
    const uStrength = uniform(1)
    patch(store, 'uniforms', { uStrength })
    const { log } = await mountReader(store, ({ uniforms }) => ({ node: uniforms.uStrength }))

    act(() => {
      uStrength.value = 5
    })

    expect(log.runs).toBe(1)
    expect(log.result!.node).toBe(uStrength)
  })
})

//* Changes to what was read ==============================

describe('useLocalNodes: changes to what the creator read', () => {
  it('rebuilds when a read uniform is replaced, and returns the stored object itself', async () => {
    const store = makeStore()
    const before = uniform(1)
    patch(store, 'uniforms', { uRead: before })
    const { log } = await mountReader(store, ({ uniforms }) => ({ node: uniforms.uRead }))
    expect(log.result!.node).toBe(before)

    const after = uniform(2)
    patch(store, 'uniforms', { uRead: after })

    expect(log.runs).toBe(2)
    expect(log.result!.node).toBe(after)
  })

  it('rebuilds when a read uniform is removed', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { uRead: uniform(1) })
    const { log } = await mountReader(store, ({ uniforms }) => ({ node: uniforms.uRead }))

    act(() => store.setState({ uniforms: {} }))

    expect(log.runs).toBe(2)
    expect(log.result!.node).toBeUndefined()
  })

  it('rebuilds when a missing leaf appears', async () => {
    const store = makeStore()
    const { log } = await mountReader(store, ({ uniforms }) => ({ node: uniforms.uLate }))
    expect(log.result!.node).toBeUndefined()

    const late = uniform(1)
    patch(store, 'uniforms', { uLate: late })

    expect(log.runs).toBe(2)
    expect(log.result!.node).toBe(late)
  })

  it('a missing scope appearing rebuilds only when it holds the leaf that was read', async () => {
    const store = makeStore()
    const { log } = await mountReader(store, ({ uniforms }) => ({ node: uniforms.scope('late').uX }))

    patch(store, 'uniforms', { late: { uY: uniform(1) } })
    expect(log.runs).toBe(1)

    const uX = uniform(2)
    patch(store, 'uniforms', { late: { uY: (store.getState().uniforms.late as { uY: unknown }).uY, uX } })
    expect(log.runs).toBe(2)
    expect(log.result!.node).toBe(uX)
  })

  it('tracks leaves reached through dot access into a scope', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { player: { uHealth: uniform(1), uMana: uniform(2) } })
    const { log } = await mountReader(store, ({ uniforms }) => ({
      node: (uniforms as unknown as Record<string, Record<string, unknown>>).player.uHealth,
    }))

    const player = store.getState().uniforms.player as Record<string, unknown>
    patch(store, 'uniforms', { player: { ...player, uMana: uniform(3) } })
    expect(log.runs).toBe(1)

    const uHealth = uniform(4)
    patch(store, 'uniforms', { player: { ...player, uHealth } })
    expect(log.runs).toBe(2)
    expect(log.result!.node).toBe(uHealth)
  })

  it('rebuilds when an entry it read turns from a leaf into a scope', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { thing: uniform(1) })
    const { log } = await mountReader(store, ({ uniforms }) => ({ node: uniforms.thing }))

    patch(store, 'uniforms', { thing: { uInner: uniform(2) } })

    expect(log.runs).toBe(2)
  })

  it('has() tracks existence only; keys() tracks membership', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { fog: { uNear: uniform(1) } })
    const hasLog = (await mountReader(store, ({ uniforms }) => ({ has: uniforms.scope('fog').has('uNear') }))).log
    const keysLog = (await mountReader(store, ({ uniforms }) => ({ keys: uniforms.scope('fog').keys() }))).log

    // Replacing uNear keeps it present and the key list unchanged
    patch(store, 'uniforms', { fog: { uNear: uniform(2) } })
    expect(hasLog.runs).toBe(1)
    expect(keysLog.runs).toBe(1)

    // Adding a key changes membership, not the existence of uNear
    patch(store, 'uniforms', { fog: { uNear: uniform(2), uFar: uniform(3) } })
    expect(hasLog.runs).toBe(1)
    expect(keysLog.runs).toBe(2)
  })

  it('conditional reads: the old branch stops invalidating, the new branch starts', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { uA: uniform(1), uB: uniform(2) })
    const log = { runs: 0 }
    function Reader({ useB }: { useB: boolean }) {
      useLocalNodes(
        ({ uniforms }) => {
          log.runs++
          return { node: useB ? uniforms.uB : uniforms.uA }
        },
        [useB],
      )
      return null
    }
    const tree = (useB: boolean) => (
      <context.Provider value={store}>
        <Reader useB={useB} />
      </context.Provider>
    )
    const view = render(tree(false))
    await act(async () => view.rerender(tree(true)))
    expect(log.runs).toBe(2)

    patch(store, 'uniforms', { uA: uniform(3) })
    expect(log.runs).toBe(2)

    patch(store, 'uniforms', { uB: uniform(4) })
    expect(log.runs).toBe(3)
  })
})

//* Resource families ==============================

describe('useLocalNodes: every resource family', () => {
  it.each(['nodes', 'buffers', 'gpuStorage'] as const)(
    '%s: replacing a read entry rebuilds, another does not',
    async (kind) => {
      const store = makeStore()
      const make = () =>
        kind === 'nodes' ? float(1) : kind === 'buffers' ? new Float32Array(1) : new THREE.StorageTexture(1, 1)
      patch(store, kind, { read: make() })
      const { log } = await mountReader(store, (state) => ({ entry: (state[kind] as Record<string, unknown>).read }))

      patch(store, kind, { other: make() })
      expect(log.runs).toBe(1)

      const next = make()
      patch(store, kind, { read: next })
      expect(log.runs).toBe(2)
      expect(log.result!.entry).toBe(next)
    },
  )

  it('textures: get(url) tracks that URL only; iteration tracks membership', async () => {
    const store = makeStore()
    const setTexture = (url: string, texture: THREE.Texture) =>
      act(() => store.setState((s) => ({ textures: new Map(s.textures).set(url, texture) })))
    setTexture('/a.png', new THREE.Texture())

    const byUrl = (await mountReader(store, ({ textures }) => ({ tex: textures.get('/a.png') }))).log
    const iterated = (await mountReader(store, ({ textures }) => ({ count: [...textures.values()].length }))).log
    const sized = (await mountReader(store, ({ textures }) => ({ size: textures.size }))).log
    expect(byUrl.result!.tex).toBeInstanceOf(THREE.Texture)

    setTexture('/b.png', new THREE.Texture())
    expect(byUrl.runs).toBe(1)
    expect(iterated.runs).toBe(2)
    expect(sized.runs).toBe(2)

    const replaced = new THREE.Texture()
    setTexture('/a.png', replaced)
    expect(byUrl.runs).toBe(2)
    expect(byUrl.result!.tex).toBe(replaced)
  })

  it('textures: a missing URL that later loads rebuilds', async () => {
    const store = makeStore()
    const { log } = await mountReader(store, ({ textures }) => ({ tex: textures.get('/late.png') }))
    expect(log.result!.tex).toBeUndefined()

    const late = new THREE.Texture()
    act(() => store.setState((s) => ({ textures: new Map(s.textures).set('/late.png', late) })))

    expect(log.runs).toBe(2)
    expect(log.result!.tex).toBe(late)
  })
})

//* Lifecycle ==============================

describe('useLocalNodes: tracked reads across the React lifecycle', () => {
  it('StrictMode: a replacement of a read resource still rebuilds once committed', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { uRead: uniform(1) })
    let result: { node: unknown } | null = null
    function Reader() {
      result = useLocalNodes(({ uniforms }) => ({ node: uniforms.uRead }), [])
      return null
    }
    render(
      <React.StrictMode>
        <context.Provider value={store}>
          <Reader />
        </context.Provider>
      </React.StrictMode>,
    )
    await act(async () => {})

    const next = uniform(2)
    patch(store, 'uniforms', { uRead: next })
    expect(result!.node).toBe(next)
  })

  it('a replacement between render and subscription is not missed', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { uRead: uniform(1) })
    const next = uniform(2)
    let result: { node: unknown } | null = null

    function Reader() {
      result = useLocalNodes(({ uniforms }) => ({ node: uniforms.uRead }), [])
      return null
    }
    // Runs in the same commit, after Reader rendered but before its subscription is live.
    function ReplaceOnCommit() {
      React.useLayoutEffect(() => store.setState((s) => ({ uniforms: { ...s.uniforms, uRead: next } })), [])
      return null
    }

    await act(async () =>
      render(
        <context.Provider value={store}>
          <Reader />
          <ReplaceOnCommit />
        </context.Provider>,
      ),
    )

    expect(result!.node).toBe(next)
  })

  it('a read of a resource STAGED in the same render settles without an extra rebuild once it commits', async () => {
    const store = makeStore()
    const log = { runs: 0 }
    function Comp() {
      useUniforms({ uStaged: 3 }, 'stage')
      useLocalNodes(({ uniforms }) => {
        log.runs++
        return { ref: uniforms.scope('stage').uStaged }
      }, [])
      return null
    }
    await act(async () =>
      render(
        <context.Provider value={store}>
          <Comp />
        </context.Provider>,
      ),
    )
    // The flush commits the very object the creator saw staged, so nothing it read changed.
    expect(log.runs).toBe(1)
  })

  it('unmount stops the subscription', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { uRead: uniform(1) })
    const { log, view } = await mountReader(store, ({ uniforms }) => ({ node: uniforms.uRead }))
    view.unmount()

    patch(store, 'uniforms', { uRead: uniform(2) })
    expect(log.runs).toBe(1)
  })
})

//* Deferred reads and create-once hooks ==============================

describe('diagnostics', () => {
  it('warns when a resource is read after the creator returned (inside a deferred Fn)', async () => {
    const store = makeStore()
    patch(store, 'uniforms', { uDeferredRead: uniform(1) })
    const { log } = await mountReader(store, ({ uniforms }) => ({ later: () => uniforms.uDeferredRead }))

    ;(log.result!.later as () => unknown)()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('uniforms.uDeferredRead was read after the creator returned'),
    )

    // Documented contract: that read is not tracked
    patch(store, 'uniforms', { uDeferredRead: uniform(2) })
    expect(log.runs).toBe(1)
  })

  it('warns when a useNodes creator reads an entry that does not exist yet, but not for has()', async () => {
    const store = makeStore()
    function Creator() {
      useNodes(({ uniforms }) => ({
        node: uniforms.has('uProbe') ? float(0) : float(1),
        missing: float(uniforms.uNotYet ? 1 : 0),
      }))
      return null
    }
    await act(async () =>
      render(
        <context.Provider value={store}>
          <Creator />
        </context.Provider>,
      ),
    )
    const messages = warnSpy.mock.calls.map((call: unknown[]) => String(call[0]))
    expect(messages.some((m: string) => m.includes('[useNodes] The creator read uniforms.uNotYet'))).toBe(true)
    expect(messages.some((m: string) => m.includes('uProbe'))).toBe(false)
  })
})

describe('useLocalNodes: staged entries that have not committed', () => {
  it('a read of an entry staged by a suspended render settles instead of looping', async () => {
    const store = makeStore()
    const pending = new Promise<void>(noop)
    const log = { runs: 0 }

    // Stages uLater during render, then suspends before its commit could flush it.
    function Stager() {
      useUniforms({ uLater: 1 })
      React.use(pending)
      return null
    }
    function Reader() {
      useLocalNodes(({ uniforms }) => {
        log.runs++
        return { node: uniforms.uLater }
      }, [])
      return null
    }

    await act(async () =>
      render(
        <context.Provider value={store}>
          <React.Suspense fallback={null}>
            <Stager />
          </React.Suspense>
          <Reader />
        </context.Provider>,
      ),
    )
    await act(async () => {})

    expect(log.runs).toBeLessThanOrEqual(2)
  })
})
