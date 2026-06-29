/**
 * @fileoverview Bug #6 regression — multi-canvas TSL state sharing via primaryStore.
 *
 * In multi-canvas WebGPU mode every store carries a `primaryStore`; shared TSL
 * resources must live on the PRIMARY store so secondary canvases see them. The
 * WebGPU hooks previously read/wrote only the local store, so secondaries never
 * shared state. These tests prove the centralized resolver (usePrimaryStore /
 * usePrimaryThree) routes both writes and reactive reads to the primary, and that
 * `useUniforms` adopts it.
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import { createStore, context } from '../../src/core/store'
import { usePrimaryStore, usePrimaryThree } from '../../src/core/hooks/usePrimaryStore'
import { useUniforms } from '../../src/webgpu'
import type { RootStore } from '../../src'

const noop = () => {}
const makeStore = () => createStore(noop, noop)

/** Render `children` with `useStore()` resolving to the given store. */
function withStore(store: RootStore, children: React.ReactNode) {
  return render(<context.Provider value={store}>{children}</context.Provider>)
}

describe('multi-canvas primaryStore sharing', () => {
  describe('usePrimaryStore (imperative writes)', () => {
    it('routes setState to the primary store from a secondary canvas', async () => {
      const primary = makeStore()
      const secondary = makeStore()
      secondary.setState({ primaryStore: primary })

      function Writer() {
        const store = usePrimaryStore()
        React.useEffect(() => {
          store.setState({ uniforms: { uShared: 1 } as any })
        }, [store])
        return null
      }

      await act(async () => {
        withStore(secondary, <Writer />)
      })

      expect(primary.getState().uniforms.uShared).toBe(1)
      expect(secondary.getState().uniforms.uShared).toBeUndefined()
    })

    it('falls back to the local store when primaryStore is absent (single-canvas)', async () => {
      const local = makeStore() // primaryStore stays null

      function Writer() {
        const store = usePrimaryStore()
        React.useEffect(() => {
          store.setState({ uniforms: { uLocal: 2 } as any })
        }, [store])
        return null
      }

      await act(async () => {
        withStore(local, <Writer />)
      })

      expect(local.getState().uniforms.uLocal).toBe(2)
    })
  })

  describe('usePrimaryThree (reactive reads)', () => {
    it('subscribes a secondary-canvas reader to primary-store updates', async () => {
      const primary = makeStore()
      const secondary = makeStore()
      secondary.setState({ primaryStore: primary })

      const seen: Array<number | undefined> = []
      function Reader() {
        const value = usePrimaryThree((s) => (s.uniforms as any).uLate as number | undefined)
        seen.push(value)
        return null
      }

      await act(async () => {
        withStore(secondary, <Reader />)
      })
      expect(seen.at(-1)).toBeUndefined()

      // Mutate the PRIMARY directly — a local-store reader would never see this.
      await act(async () => {
        primary.setState((s) => ({ uniforms: { ...s.uniforms, uLate: 42 } as any }))
      })

      expect(seen.at(-1)).toBe(42)
    })
  })

  describe('useUniforms adopts the resolver', () => {
    it('creates shared uniforms on the primary store from a secondary canvas', async () => {
      const primary = makeStore()
      const secondary = makeStore()
      secondary.setState({ primaryStore: primary })

      function Component() {
        useUniforms({ uShared: 5 })
        return null
      }

      await act(async () => {
        withStore(secondary, <Component />)
      })

      // The uniform node was created on the primary, not the local secondary store.
      expect(primary.getState().uniforms.uShared).toBeDefined()
      expect(secondary.getState().uniforms.uShared).toBeUndefined()
    })
  })
})
