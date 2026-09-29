/**
 * @fileoverview The install form of `useLocalNodes` (#3890, #3893).
 *
 * A creator may return a function instead of a record. The creator builds during render; the
 * returned function runs after commit (a layout effect) and may return a cleanup, which runs before
 * the next install and on unmount. Nothing is mutated during render, so a discarded render leaves
 * nothing behind.
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three/webgpu'
import { float, uniform } from 'three/tsl'

import type { RootStore } from '@react-three/fiber/webgpu'
import { useLocalNodes, useUniforms, rebuildAllNodes } from '../src'
import { createStore, context } from './store'

const noop = () => {}
const makeStore = () => createStore(noop, noop)

let warnSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(noop)
})
afterEach(() => warnSpy.mockRestore())

const warnings = () => warnSpy.mock.calls.map((call: unknown[]) => String(call[0]))

/** A target standing in for a Three object the install step writes to. */
function makeTarget() {
  return { fogNode: null as unknown, events: [] as string[] }
}

/** A component that builds a node tagged `tag` and installs it on `target`. */
function Installer({
  target,
  tag,
  deps = [],
}: {
  target: ReturnType<typeof makeTarget>
  tag: string
  deps?: unknown[]
}) {
  const result = useLocalNodes(() => {
    const node = float(tag.charCodeAt(0))
    ;(node as unknown as { tag: string }).tag = tag
    return () => {
      target.fogNode = node
      target.events.push(`install:${tag}`)
      return () => {
        target.events.push(`cleanup:${tag}`)
        if (target.fogNode === node) target.fogNode = null
      }
    }
  }, deps)
  // The hook returns nothing in the install form
  if (result !== undefined) throw new Error('install form must return undefined')
  return null
}

const tagOf = (node: unknown) => (node as { tag?: string } | null)?.tag

function withStore(store: RootStore, children: React.ReactNode) {
  return render(<context.Provider value={store}>{children}</context.Provider>)
}

describe('useLocalNodes: install form', () => {
  it('installs after commit, and cleans up on unmount', async () => {
    const store = makeStore()
    const target = makeTarget()
    const view = withStore(store, <Installer target={target} tag="a" />)
    await act(async () => {})

    expect(tagOf(target.fogNode)).toBe('a')
    expect(target.events).toEqual(['install:a'])

    view.unmount()
    expect(target.fogNode).toBeNull()
    expect(target.events).toEqual(['install:a', 'cleanup:a'])
  })

  it('a deps change cleans up the previous install, then installs the new build', async () => {
    const store = makeStore()
    const target = makeTarget()
    const view = withStore(store, <Installer target={target} tag="a" deps={['a']} />)
    await act(async () => {})

    // Same deps, new render: no reinstall
    await act(async () =>
      view.rerender(
        <context.Provider value={store}>{<Installer target={target} tag="a" deps={['a']} />}</context.Provider>,
      ),
    )
    expect(target.events).toEqual(['install:a'])

    await act(async () =>
      view.rerender(
        <context.Provider value={store}>{<Installer target={target} tag="b" deps={['b']} />}</context.Provider>,
      ),
    )
    expect(target.events).toEqual(['install:a', 'cleanup:a', 'install:b'])
    expect(tagOf(target.fogNode)).toBe('b')
  })

  it('a replaced resource read by the creator rebuilds and reinstalls', async () => {
    const store = makeStore()
    act(() => store.setState((s) => ({ uniforms: { ...s.uniforms, uFog: uniform(1) } })))
    const scene = { fogNode: null as unknown }
    let installs = 0

    function Fog() {
      useLocalNodes(({ uniforms }) => {
        const fogNode = uniforms.uFog
        return () => {
          installs++
          scene.fogNode = fogNode
          return () => void (scene.fogNode = null)
        }
      }, [])
      return null
    }
    withStore(store, <Fog />)
    await act(async () => {})
    expect(installs).toBe(1)

    const next = uniform(2)
    act(() => store.setState((s) => ({ uniforms: { ...s.uniforms, uFog: next } })))
    expect(installs).toBe(2)
    expect(scene.fogNode).toBe(next)
  })

  it('rebuildAllNodes() rebuilds and reinstalls', async () => {
    const store = makeStore()
    const target = makeTarget()
    withStore(store, <Installer target={target} tag="a" />)
    await act(async () => {})
    const first = target.fogNode

    await act(async () => rebuildAllNodes(store))
    expect(target.events).toEqual(['install:a', 'cleanup:a', 'install:a'])
    expect(target.fogNode).not.toBe(first)
  })

  it('StrictMode: mount, cleanup and mount again leaves the final install in place', async () => {
    const store = makeStore()
    const target = makeTarget()
    render(
      <React.StrictMode>
        <context.Provider value={store}>
          <Installer target={target} tag="a" />
        </context.Provider>
      </React.StrictMode>,
    )
    await act(async () => {})

    expect(target.events.at(-1)).toBe('install:a')
    expect(target.events.filter((e) => e === 'install:a').length).toBe(
      target.events.filter((e) => e === 'cleanup:a').length + 1,
    )
    expect(tagOf(target.fogNode)).toBe('a')
  })

  it('a render that suspends and is discarded never installs', async () => {
    const store = makeStore()
    const target = makeTarget()
    const pending = { promise: new Promise<void>(noop) }
    let setTag: (tag: string) => void = noop

    function Suspender({ tag }: { tag: string }) {
      if (tag === 'b') React.use(pending.promise)
      return null
    }
    function Parent() {
      const [tag, set] = React.useState('a')
      setTag = set
      return (
        <React.Suspense fallback={null}>
          <Installer target={target} tag={tag} deps={[tag]} />
          <Suspender tag={tag} />
        </React.Suspense>
      )
    }

    withStore(store, <Parent />)
    await act(async () => {})
    await act(async () => React.startTransition(() => setTag('b')))
    // b was built during the discarded render, but nothing was installed or cleaned up
    expect(target.events).toEqual(['install:a'])
    expect(tagOf(target.fogNode)).toBe('a')

    await act(async () => setTag('a'))
    expect(tagOf(target.fogNode)).toBe('a')
  })

  it('an install step that builds from a uniform staged in the same render sees it', async () => {
    const store = makeStore()
    const scene = { fogNode: null as unknown }

    function Fog() {
      useUniforms({ uStaged: 3 }, 'fog')
      useLocalNodes(
        ({ uniforms }) =>
          () => {
            // Built inside the install step, after the staged uniform was flushed onto the store
            scene.fogNode = uniforms.scope('fog').uStaged
            return () => void (scene.fogNode = null)
          },
        [],
      )
      return null
    }
    await act(async () => withStore(store, <Fog />))

    expect(scene.fogNode).toBeDefined()
    expect((scene.fogNode as { value: number }).value).toBe(3)
  })

  it('works with a real Three scene', async () => {
    const store = makeStore()
    const scene = new THREE.Scene()
    act(() => store.setState({ scene }))

    function Fog() {
      useLocalNodes(({ scene }) => {
        const fogNode = float(0.5)
        return () => {
          ;(scene as unknown as { fogNode: unknown }).fogNode = fogNode
          return () => void ((scene as unknown as { fogNode: unknown }).fogNode = null)
        }
      }, [])
      return null
    }
    const view = withStore(store, <Fog />)
    await act(async () => {})
    expect((scene as unknown as { fogNode: unknown }).fogNode).toBeTruthy()

    view.unmount()
    expect((scene as unknown as { fogNode: unknown }).fogNode).toBeNull()
  })
})

describe('useLocalNodes: install form diagnostics', () => {
  it('warns when the creator returns nothing', async () => {
    const store = makeStore()
    function Bare() {
      // @ts-expect-error a creator must return a record or an install function
      useLocalNodes(() => {}, [])
      return null
    }
    withStore(store, <Bare />)
    await act(async () => {})
    expect(warnings().some((m: string) => m.includes('[useLocalNodes] The creator returned nothing'))).toBe(true)
  })

  it('warns when a mounted component switches between the record and install forms', async () => {
    const store = makeStore()
    function Switching({ install }: { install: boolean }) {
      useLocalNodes((() => (install ? () => {} : { node: float(1) })) as () => { node: unknown }, [install])
      return null
    }
    const view = withStore(store, <Switching install={false} />)
    await act(async () => {})
    await act(async () => view.rerender(<context.Provider value={store}>{<Switching install />}</context.Provider>))
    expect(
      warnings().some((m: string) =>
        m.includes('switched between returning a record and returning an install function'),
      ),
    ).toBe(true)
  })
})
