/**
 * @fileoverview Canvas root-ordering integration tests (#3877)
 *
 * Canvas ordering belongs to Scheduler roots because every job owned by one
 * Canvas must execute together. Render FPS remains job-scoped so update work
 * can continue while the default renderer is throttled.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { vi } from 'vitest'
import { getScheduler, Scheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { createRoot, extend, useFrame } from '../src'

extend(THREE as any)

//* Mock Renderer ==============================

class MockWebGPURenderer {
  canvas: HTMLCanvasElement
  animationLoop: XRFrameRequestCallback | null = null
  private _initialized = false
  private xrListeners = new Map<string, Set<() => void>>()
  private onRender: () => void
  shadowMap = { enabled: false, type: THREE.PCFSoftShadowMap }
  outputColorSpace = THREE.SRGBColorSpace
  toneMapping = THREE.ACESFilmicToneMapping
  xr = {
    enabled: false,
    isPresenting: false,
    addEventListener: (type: string, callback: () => void) => {
      let listeners = this.xrListeners.get(type)
      if (!listeners) this.xrListeners.set(type, (listeners = new Set()))
      listeners.add(callback)
    },
    removeEventListener: (type: string, callback: () => void) => {
      this.xrListeners.get(type)?.delete(callback)
    },
    setAnimationLoop: (callback: XRFrameRequestCallback | null) => {
      this.animationLoop = callback
    },
  }
  backend = { isWebGPUBackend: true }
  renderLists = { dispose: () => {} }

  constructor(params: { canvas: HTMLCanvasElement; onRender: () => void }) {
    this.canvas = params.canvas
    this.onRender = params.onRender
  }

  async init() {
    this._initialized = true
    return Promise.resolve()
  }

  hasInitialized() {
    return this._initialized
  }

  render(_scene: THREE.Scene, _camera: THREE.Camera) {
    this.onRender()
  }

  forceContextLoss() {}
  dispose() {}
  setSize() {}
  setPixelRatio() {}
}

//* Test Helpers ==============================

type TestRoot = ReturnType<typeof createRoot>

function Ticker({ onFrame }: { onFrame: () => void }) {
  useFrame(onFrame)
  return null
}

async function configureRoot(
  root: TestRoot,
  id: string,
  renderer: MockWebGPURenderer,
  scheduler?: { before?: string | string[]; after?: string | string[]; order?: number; fps?: number },
  children: React.ReactNode = <mesh />,
) {
  await act(async () => {
    ;(
      await root.configure({
        id,
        renderer,
        frameloop: 'never',
        scheduler,
      })
    ).render(children)
  })
}

describe('Canvas root ordering (#3877)', () => {
  const roots: TestRoot[] = []
  let testRun = 0
  let testPrefix: string

  beforeEach(() => {
    Scheduler.reset()
    testPrefix = `root-ordering-${++testRun}`
  })

  afterEach(async () => {
    await act(async () => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    Scheduler.reset()
    vi.restoreAllMocks()
  })

  function rootId(name: string) {
    return `${testPrefix}-${name}`
  }

  function createTestRoot(onRender: () => void) {
    const canvas = createCanvas()
    const root = createRoot(canvas)
    const renderer = new MockWebGPURenderer({ canvas, onRender })
    roots.push(root)
    return { root, renderer }
  }

  it('orders roots by dependency even when the dependent Canvas mounts first', async () => {
    const renderOrder: string[] = []
    const secondary = createTestRoot(() => renderOrder.push('secondary'))
    const main = createTestRoot(() => renderOrder.push('main'))
    const secondaryId = rootId('secondary')
    const mainId = rootId('main')

    await configureRoot(secondary.root, secondaryId, secondary.renderer, { after: mainId })
    await configureRoot(main.root, mainId, main.renderer)

    getScheduler().step(1000)
    expect(renderOrder).toEqual(['main', 'secondary'])
  })

  it('applies runtime root dependency changes on the next frame', async () => {
    const renderOrder: string[] = []
    const first = createTestRoot(() => renderOrder.push('first'))
    const second = createTestRoot(() => renderOrder.push('second'))
    const firstId = rootId('first')
    const secondId = rootId('second')

    await configureRoot(first.root, firstId, first.renderer)
    await configureRoot(second.root, secondId, second.renderer)

    await configureRoot(first.root, firstId, first.renderer, { after: secondId })
    getScheduler().step(1000)
    expect(renderOrder).toEqual(['second', 'first'])

    renderOrder.length = 0
    await configureRoot(first.root, firstId, first.renderer, { before: secondId })
    getScheduler().step(1016)
    expect(renderOrder).toEqual(['first', 'second'])
  })

  it('applies runtime numeric root order changes on the next frame', async () => {
    const renderOrder: string[] = []
    const first = createTestRoot(() => renderOrder.push('first'))
    const second = createTestRoot(() => renderOrder.push('second'))
    const firstId = rootId('first')
    const secondId = rootId('second')

    await configureRoot(first.root, firstId, first.renderer)
    await configureRoot(second.root, secondId, second.renderer)

    await configureRoot(first.root, firstId, first.renderer, { order: 2 })
    getScheduler().step(1000)
    expect(renderOrder).toEqual(['second', 'first'])
  })

  it('reactivates a dormant dependency when its target root re-registers', async () => {
    const renderOrder: string[] = []
    const secondary = createTestRoot(() => renderOrder.push('secondary'))
    const main = createTestRoot(() => renderOrder.push('main'))
    const secondaryId = rootId('secondary')
    const mainId = rootId('main')

    await configureRoot(secondary.root, secondaryId, secondary.renderer, { after: mainId })
    await configureRoot(main.root, mainId, main.renderer)

    await act(async () => main.root.unmount())
    renderOrder.length = 0

    getScheduler().step(1000)
    expect(renderOrder).toEqual(['secondary'])

    const replacement = createTestRoot(() => renderOrder.push('main'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await configureRoot(replacement.root, mainId, replacement.renderer)
    expect(warn).toHaveBeenCalledWith(`Canvas with id="${mainId}" already registered. Overwriting.`)
    renderOrder.length = 0

    getScheduler().step(1016)
    expect(renderOrder).toEqual(['main', 'secondary'])
  })

  it('keeps fps scoped to the default render job', async () => {
    const render = vi.fn()
    const frame = vi.fn()
    const canvas = createTestRoot(render)

    await configureRoot(canvas.root, rootId('throttled'), canvas.renderer, { fps: 30 }, <Ticker onFrame={frame} />)

    getScheduler().step(1000)
    getScheduler().step(1010)
    getScheduler().step(1050)

    expect(frame).toHaveBeenCalledTimes(3)
    expect(render).toHaveBeenCalledTimes(2)
  })
})
