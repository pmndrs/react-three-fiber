/**
 * Canvas root lifetime vs. Fast Refresh of Canvas.tsx itself — Tier 1 (jsdom).
 *
 * Editing Canvas.tsx (e.g. in the examples app, which runs fiber from source) hot-swaps
 * `CanvasImpl`. React then replays every effect of the swapped component in one commit, insertion
 * effects included, whatever their dependencies. The Canvas releases its root in an insertion
 * cleanup (so a Canvas removed while an <Activity> hides it is released, #3978); if that cleanup
 * released right away, the replay unmounted the live root, the layout effect built a second one on
 * the dying entry ("createRoot should only be called once!"), and ~500ms later the stale teardown
 * forced the context lost and dropped the canvas from `_roots`: the scene was dead until the next
 * save. The release is deferred and skipped when the setup re-armed in the same commit.
 */
// Must load before react-dom, which hands its refresh entry points to the DevTools hook on load
import { hotSwap, findComponentType, refreshAvailable } from './utils/refresh'

import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three'

import { Canvas } from '../src'
import { _roots } from '../src/core/root'
import type { RootState } from '../src'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Fast Refresh of <Canvas> itself', () => {
  it('keeps the root when CanvasImpl is hot-swapped, and still releases it on unmount', async () => {
    expect(refreshAvailable()).toBe(true)

    const created: RootState[] = []
    const mesh = new THREE.Mesh()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let unmount!: () => void
    await act(async () => {
      unmount = render(
        <div style={{ width: 100, height: 100 }}>
          <Canvas onCreated={(state) => created.push(state)}>
            <primitive object={mesh} />
          </Canvas>
        </div>,
      ).unmount
      await wait(50)
    })

    const state = created[0]
    const canvas = state.renderer.domElement as HTMLCanvasElement
    const store = _roots.get(canvas)!.store
    const renderer = state.renderer
    const dispose = vi.spyOn(renderer, 'dispose')
    const forceContextLoss = vi.spyOn(renderer as THREE.WebGLRenderer, 'forceContextLoss')

    // Edit Canvas.tsx: CanvasImpl re-renders as a new function with the same hooks
    const previous = findComponentType(canvas, 'CanvasImpl')!
    expect(previous).toBeTypeOf('function')
    await act(async () => {
      hotSwap(previous, function CanvasImpl(props: any) {
        return previous(props)
      })
      await wait(10)
    })

    // Past the 500ms deferred teardown a released root would have run
    await act(async () => wait(700))

    expect(_roots.get(canvas)?.store).toBe(store)
    expect(store.getState().internal.active).toBe(true)
    expect(store.getState().renderer).toBe(renderer)
    expect(store.getState().scene.children).toContain(mesh)
    expect(created).toHaveLength(1)
    expect(dispose).not.toHaveBeenCalled()
    expect(forceContextLoss).not.toHaveBeenCalled()
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('createRoot'))).toHaveLength(0)

    // The deferral must not cost a real removal its release
    await act(async () => {
      unmount()
      await wait(20)
    })
    expect(store.getState().internal.active).toBe(false)

    warn.mockRestore()
  })
})
