/**
 * @fileoverview Root extension registry and render override
 *
 * The seams packages building on fiber use (see src/core/extensions.ts):
 *   - registerRootExtension: per-root setup / dispose / hmr, driven by the root lifecycle
 *   - setRenderOverride: replace the default render call while keeping fps, takeover and errors
 *
 * Roots are real createRoot() roots on a mock WebGPU renderer (same pattern as
 * scheduler-integration.test.tsx); frames are stepped by hand with frameloop: 'never'.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { vi } from 'vitest'
import { getScheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { createRoot, useFrame, extend, registerRootExtension, setRenderOverride } from '../src'
import type { RootExtension, RootStore } from '../src'
import { detachRootExtensions, notifyRootExtensionsHmr } from '../src/core/extensions'

//* Mock Renderer ==============================
class MockWebGPURenderer {
  canvas: HTMLCanvasElement
  shadowMap = { enabled: false, type: THREE.PCFSoftShadowMap }
  outputColorSpace = THREE.SRGBColorSpace
  toneMapping = THREE.ACESFilmicToneMapping
  xr = {
    enabled: false,
    isPresenting: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    setAnimationLoop: () => {},
  }
  backend = { isWebGPUBackend: true }
  renderLists = { dispose: () => {} }

  constructor(params?: { canvas?: HTMLCanvasElement }) {
    this.canvas = params?.canvas || document.createElement('canvas')
  }
  async init() {}
  hasInitialized() {
    return true
  }
  render(_scene: THREE.Scene, _camera: THREE.Camera) {}
  forceContextLoss() {}
  dispose() {}
  setSize() {}
  setPixelRatio() {}
}

//* Helpers ==============================
let nameSeq = 0
/** Each test registers under a fresh name: the registry is global and outlives a test. */
const uniqueName = () => `test-extension-${++nameSeq}`

const cleanups: Array<() => void> = []
function register(extension: RootExtension) {
  const unregister = registerRootExtension(extension)
  cleanups.push(unregister)
  return unregister
}

async function mount(options: { onCreated?: (state: any) => void; fps?: number; children?: React.ReactNode } = {}) {
  const canvas = createCanvas()
  const root = createRoot(canvas)
  const renderer = new MockWebGPURenderer({ canvas })
  let store!: RootStore
  await act(async () => {
    const configured = await root.configure({
      renderer: renderer as any,
      frameloop: 'never',
      onCreated: options.onCreated,
      ...(options.fps && { scheduler: { fps: options.fps } }),
    })
    store = configured.render(options.children ?? <group />)
  })
  const unmount = async () => {
    await act(async () => root.unmount())
    // unmountComponentAtNode detaches extensions in the reconciler's commit callback
    await act(async () => {})
  }
  return { root, store, renderer, unmount }
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

//* Registry ==============================

describe('registerRootExtension', () => {
  it('sets up each root once, after its renderer exists and before onCreated, merging what setup returns', async () => {
    const calls: string[] = []
    const setup = vi.fn((store: RootStore) => {
      // The renderer and primaryStore are already known here -- that is the contract.
      expect(store.getState().internal.actualRenderer).toBeTruthy()
      expect(store.getState().primaryStore).toBe(store)
      calls.push('setup')
      return { textureColorSpace: THREE.LinearSRGBColorSpace }
    })
    register({ name: uniqueName(), setup })

    const { store, unmount } = await mount({ onCreated: () => calls.push('onCreated') })

    expect(setup).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['setup', 'onCreated'])
    expect(store.getState().textureColorSpace).toBe(THREE.LinearSRGBColorSpace)
    await unmount()
  })

  it('does not set a root up again when it is reconfigured', async () => {
    const setup = vi.fn()
    register({ name: uniqueName(), setup })

    const { root, unmount } = await mount()
    await act(async () => (await root.configure({ frameloop: 'never', dpr: 2 })).render(<group />))

    expect(setup).toHaveBeenCalledTimes(1)
    await unmount()
  })

  it('sets a store up again when it is configured after being detached (createRoot reusing a store)', async () => {
    // createRoot reuses the previous store for a canvas until the unmount teardown timer drops it,
    // so a quick remount can configure a store whose extensions were already disposed.
    const extension = { name: uniqueName(), setup: vi.fn(), dispose: vi.fn() }
    register(extension)
    const { root, store, unmount } = await mount()

    detachRootExtensions(store)
    expect(extension.dispose).toHaveBeenCalledTimes(1)

    await act(async () => (await root.configure({ frameloop: 'never' })).render(<group />))
    expect(extension.setup).toHaveBeenCalledTimes(2)
    await unmount()
    expect(extension.dispose).toHaveBeenCalledTimes(2)
  })

  it('leaves state untouched when setup returns nothing (an extension skipping a root)', async () => {
    const setup = vi.fn((store: RootStore) => {
      if (store.getState().isLegacy) return { textureColorSpace: THREE.LinearSRGBColorSpace }
    })
    register({ name: uniqueName(), setup })

    const { store, unmount } = await mount()

    expect(setup).toHaveBeenCalledTimes(1)
    expect(store.getState().textureColorSpace).toBe(THREE.SRGBColorSpace)
    await unmount()
  })

  it('sets up roots that already exist when registered late', async () => {
    const { store, unmount } = await mount()

    const setup = vi.fn(() => ({ textureColorSpace: THREE.LinearSRGBColorSpace }))
    register({ name: uniqueName(), setup })

    expect(setup).toHaveBeenCalledWith(store)
    expect(store.getState().textureColorSpace).toBe(THREE.LinearSRGBColorSpace)
    await unmount()
  })

  it('runs dispose when a root it set up unmounts, and forgets the root', async () => {
    const dispose = vi.fn()
    const setup = vi.fn()
    const name = uniqueName()
    register({ name, setup, dispose })

    const { store, unmount } = await mount()
    await unmount()

    expect(dispose).toHaveBeenCalledTimes(1)
    expect(dispose).toHaveBeenCalledWith(store)

    // A later registration must not reach the unmounted root.
    const lateSetup = vi.fn()
    register({ name: uniqueName(), setup: lateSetup })
    expect(lateSetup).not.toHaveBeenCalledWith(store)
  })

  it('replaces an entry registered under the same name without setting roots up twice', async () => {
    const name = uniqueName()
    const first = { name, setup: vi.fn(), hmr: vi.fn(), dispose: vi.fn() }
    register(first)
    const { store, unmount } = await mount()

    // Hot re-registration: new code, same name.
    const second = { name, setup: vi.fn(), hmr: vi.fn(), dispose: vi.fn() }
    register(second)
    expect(second.setup).not.toHaveBeenCalled()

    // ...but the new entry's hooks handle the root from now on.
    notifyRootExtensionsHmr(store)
    expect(second.hmr).toHaveBeenCalledWith(store)
    expect(first.hmr).not.toHaveBeenCalled()

    // New roots get the new setup.
    const other = await mount()
    expect(second.setup).toHaveBeenCalledWith(other.store)
    expect(first.setup).toHaveBeenCalledTimes(1)

    await unmount()
    await other.unmount()
    expect(second.dispose).toHaveBeenCalledTimes(2)
    expect(first.dispose).not.toHaveBeenCalled()
  })

  it('stops setting up new roots once unregistered, but still disposes the roots it set up', async () => {
    const extension = { name: uniqueName(), setup: vi.fn(), dispose: vi.fn() }
    const unregister = register(extension)
    const { store, unmount } = await mount()

    unregister()
    const other = await mount()
    expect(extension.setup).toHaveBeenCalledTimes(1)
    expect(extension.setup).not.toHaveBeenCalledWith(other.store)

    await unmount()
    expect(extension.dispose).toHaveBeenCalledWith(store)
    await other.unmount()
  })

  it('forwards hot updates only to extensions that set the root up', async () => {
    const { store, unmount } = await mount()
    const setUp = { name: uniqueName(), setup: vi.fn(), hmr: vi.fn() }
    register(setUp)

    notifyRootExtensionsHmr(store)
    expect(setUp.hmr).toHaveBeenCalledWith(store)
    await unmount()

    // After unmount the root is forgotten: no hmr for it.
    setUp.hmr.mockClear()
    notifyRootExtensionsHmr(store)
    expect(setUp.hmr).not.toHaveBeenCalled()
  })

  it('shares one registry across separately loaded copies of the module (mixed entry points)', async () => {
    // Every fiber entry bundles its own copy of core. An extension registered through one copy
    // (e.g. @react-three/fiber/extension) must see roots attached by another (e.g. the default
    // entry's renderer). vi.resetModules() gives two independent module instances, like two bundles.
    vi.resetModules()
    const copyA = await import('../src/core/extensions')
    vi.resetModules()
    const copyB = await import('../src/core/extensions')
    expect(copyA).not.toBe(copyB)

    const { store, unmount } = await mount() // attached through the test's own copy
    const setup = vi.fn()
    const unregister = copyA.registerRootExtension({ name: uniqueName(), setup })
    cleanups.push(unregister)
    expect(setup).toHaveBeenCalledWith(store)

    const hmr = vi.fn()
    cleanups.push(copyB.registerRootExtension({ name: uniqueName(), hmr }))
    copyA.notifyRootExtensionsHmr(store)
    expect(hmr).toHaveBeenCalledWith(store)
    await unmount()
  })
})

//* Render override ==============================

describe('setRenderOverride', () => {
  const step = async (...timestamps: number[]) => {
    await act(async () => {
      for (const t of timestamps) getScheduler().step(t)
    })
  }

  it('replaces renderer.render in the default render job, and null restores it', async () => {
    const { store, renderer, unmount } = await mount()
    const renderSpy = vi.spyOn(renderer, 'render')
    const override = vi.fn()

    setRenderOverride(store, override)
    await step(1000, 1016)
    expect(override).toHaveBeenCalledTimes(2)
    expect(renderSpy).not.toHaveBeenCalled()

    setRenderOverride(store, null)
    override.mockClear()
    await step(1032)
    expect(override).not.toHaveBeenCalled()
    expect(renderSpy).toHaveBeenCalledTimes(1)
    await unmount()
  })

  it('backs off, like the default render, when a user render-phase job takes over', async () => {
    const userRender = vi.fn()
    const Takeover = () => {
      useFrame(userRender, { phase: 'render' })
      return null
    }
    const { store, unmount } = await mount({ children: <Takeover /> })
    const override = vi.fn()
    setRenderOverride(store, override)

    await step(2000, 2016)
    expect(userRender).toHaveBeenCalledTimes(2)
    expect(override).not.toHaveBeenCalled()
    await unmount()
  })

  it('is throttled by the Canvas scheduler fps, like the default render', async () => {
    const { store, unmount } = await mount({ fps: 10 })
    const override = vi.fn()
    setRenderOverride(store, override)

    // 10 fps = one render per 100ms. Frames every ~16ms across 300ms must not render every frame.
    const frames = Array.from({ length: 19 }, (_, i) => 3000 + i * 16.67)
    await step(...frames)
    expect(override.mock.calls.length).toBeGreaterThan(0)
    expect(override.mock.calls.length).toBeLessThanOrEqual(4)
    await unmount()
  })

  it('reports an error thrown by the override to the root error state', async () => {
    const { store, unmount } = await mount()
    setRenderOverride(store, () => {
      throw new Error('pipeline exploded')
    })

    await step(4000)
    expect(store.getState().error?.message).toBe('pipeline exploded')
    // Clear it again so the Canvas error path does not leak into unmount.
    await act(async () => store.getState().setError(null))
    setRenderOverride(store, null)
    await unmount()
  })
})
