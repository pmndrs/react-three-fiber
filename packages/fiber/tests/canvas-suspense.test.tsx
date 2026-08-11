/**
 * Canvas root lifetime vs. suspension — Tier 1 (jsdom).
 *
 * Regression for #3850: suspending inside <Canvas> destroyed and re-created the whole renderer
 * root, silently discarding everything created inside it (useGPUStorage buffers included).
 *
 * The mechanism: a child suspending with no <Suspense> of its own renders `Block`, which lifts
 * the promise out to the boundary *outside* the Canvas so the DOM-level `fallback` can show.
 * CanvasImpl then suspends, React destroys its passive effects, and the teardown effect ran
 * `unmountComponentAtNode` on the shared root.
 *
 * Reproducing it needs all three of:
 *   1. StrictMode        — Next.js dev's default, and what makes React destroy the effects here
 *   2. an outer Suspense — Next.js App Router wraps pages in one
 *   3. a child that suspends with no inner <Suspense>
 *
 * Without StrictMode the root survives on its own, which is why this looked environment-specific.
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import { suspend } from 'suspend-react'

import { Canvas, extend, useStore } from '../src'
import type { RootStore } from '../src'

extend(THREE as any)

/** A child that suspends until the returned `resolve` is called, like useTexture does. */
function makeGate(key: string) {
  let resolve: (v: unknown) => void = () => {}
  function Gate() {
    suspend(() => new Promise((res) => (resolve = res)), [key])
    return null
  }
  return { Gate, resolve: (v: unknown = null) => resolve(v) }
}

/** Records the store it is mounted under, and stamps a marker to stand in for a GPU resource. */
function makeOwner(seen: RootStore[]) {
  return function Owner() {
    const store = useStore()
    seen.push(store)
    if (!(store.getState() as any).__resource) {
      store.setState({ __resource: { id: 'gpu-buffer' } } as any)
    }
    return null
  }
}

describe('suspending inside <Canvas> (#3850)', () => {
  it('keeps the renderer root alive across a suspension', async () => {
    const { Gate, resolve } = makeGate('canvas-suspense-keep')
    const seen: RootStore[] = []
    const Owner = makeOwner(seen)
    const created: unknown[] = []
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await act(async () => {
      render(
        <React.StrictMode>
          <div style={{ width: 100, height: 100 }}>
            <React.Suspense fallback={<span>outer</span>}>
              <Canvas onCreated={(s) => created.push(s)}>
                <Owner />
                <Gate />
              </Canvas>
            </React.Suspense>
          </div>
        </React.StrictMode>,
      )
      await new Promise((r) => setTimeout(r, 50))
    })

    await act(async () => {
      resolve()
      await new Promise((r) => setTimeout(r, 50))
    })

    // The root was created exactly once. Previously the suspension tore it down and the reveal
    // built a second one, which is what surfaced as "R3F.createRoot should only be called once!"
    expect(created).toHaveLength(1)
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('createRoot'))).toHaveLength(0)

    // Same store throughout — so anything registered on it survived.
    expect(new Set(seen).size).toBe(1)
    expect((seen[seen.length - 1].getState() as any).__resource).toEqual({ id: 'gpu-buffer' })

    warn.mockRestore()
  })

  it('still releases the root on a real unmount', async () => {
    // The other direction, and the one that would bite silently. The fix distinguishes "hidden"
    // from "unmounted" by whether the canvas is still in the document; if that ever stopped
    // holding, every root would leak instead.
    const seen: RootStore[] = []
    const Owner = makeOwner(seen)

    let unmount!: () => void
    await act(async () => {
      const utils = render(
        <div style={{ width: 100, height: 100 }}>
          <Canvas>
            <Owner />
          </Canvas>
        </div>,
      )
      unmount = utils.unmount
      await new Promise((r) => setTimeout(r, 50))
    })

    const store = seen[seen.length - 1]
    expect(store).toBeDefined()
    expect(store.getState().internal.active).toBe(true)

    await act(async () => {
      unmount()
      await new Promise((r) => setTimeout(r, 20))
    })

    // `internal.active = false` is the first thing unmountComponentAtNode does, and it does it
    // synchronously — the rest of the teardown (including the _roots delete) is deferred behind a
    // 500ms timer, so this is the signal that actually pins "the teardown ran" without racing it.
    expect(store.getState().internal.active).toBe(false)
  })
})
