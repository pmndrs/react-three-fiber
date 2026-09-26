/**
 * @fileoverview Real roots for the tsl tests: createRoot + a mock WebGPU renderer that keeps three's
 * CanvasTarget contract (as in fiber's primary-canvas-target.test.tsx), so primary and secondary
 * canvases configure for real and the root extension sets them up.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { CanvasTarget } from 'three/webgpu'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'
import { createRoot, Scheduler } from '@react-three/fiber'
import type { RootStore } from '@react-three/fiber'

//* Mock Renderer ==============================
// Enough of three's WebGPURenderer contract for primary/secondary canvases: a default CanvasTarget
// around the element, setCanvasTarget, and target-implicit sizing.
export class MockWebGPURenderer {
  canvas: HTMLCanvasElement
  backend = { isWebGPUBackend: true, updateSize: () => {} }
  shadowMap = { enabled: false, type: THREE.PCFSoftShadowMap }
  outputColorSpace = THREE.SRGBColorSpace
  toneMapping = THREE.ACESFilmicToneMapping
  renderLists = { dispose: () => {} }
  xr = {
    enabled: false,
    isPresenting: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    setAnimationLoop: () => {},
  }
  private _canvasTarget: CanvasTarget

  constructor(params: { canvas: HTMLCanvasElement }) {
    this.canvas = params.canvas
    this._canvasTarget = new CanvasTarget(params.canvas)
  }
  async init() {}
  hasInitialized() {
    return true
  }
  getCanvasTarget() {
    return this._canvasTarget
  }
  setCanvasTarget(target: CanvasTarget) {
    this._canvasTarget = target
  }
  setSize(width: number, height: number, updateStyle?: boolean) {
    this._canvasTarget.setSize(width, height, updateStyle)
  }
  setPixelRatio(value: number) {
    this._canvasTarget.setPixelRatio(value)
  }
  render() {}
  dispose() {}
  forceContextLoss() {}
}

//* Harness ==============================

type TestRoot = ReturnType<typeof createRoot>
const size = { width: 320, height: 240, top: 0, left: 0 }

let run = 0
let current = ''
const roots: TestRoot[] = []

/** Installs per-test setup and teardown: unique canvas ids, and every root unmounted afterwards. */
export function setupRealRoots(name: string) {
  beforeEach(() => {
    Scheduler.reset()
    current = `${name}-${++run}`
  })

  afterEach(async () => {
    await act(async () => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    Scheduler.reset()
  })
}

/** This test's canvas id prefix. */
export const prefix = () => current

export async function mountPrimary(children: React.ReactNode, id = `${current}-main`) {
  const canvas = createCanvas()
  const root = createRoot(canvas)
  roots.push(root)
  const renderer = new MockWebGPURenderer({ canvas })
  let store!: RootStore
  await act(async () => {
    store = (await root.configure({ id, renderer: renderer as any, size, frameloop: 'never' })).render(children)
  })
  return { root, store, id }
}

/** Starts configuring a secondary. Returns once it has rendered (it waits for its primary). */
export function startSecondary(
  primaryCanvas: string,
  children: React.ReactNode,
  id = `${current}-sec-${roots.length}`,
) {
  const canvas = createCanvas()
  const root = createRoot(canvas)
  roots.push(root)
  const ready = (async () => {
    const configured = await root.configure({
      id,
      primaryCanvas,
      renderer: { primaryCanvas } as any,
      size,
      frameloop: 'never',
      scheduler: { after: primaryCanvas },
    })
    return configured.render(children)
  })()
  return { root, ready }
}

export async function mountSecondary(primaryCanvas: string, children: React.ReactNode) {
  const { root, ready } = startSecondary(primaryCanvas, children)
  let store!: RootStore
  await act(async () => {
    store = await ready
  })
  return { root, store }
}

export async function mountIndependent(children: React.ReactNode) {
  return mountPrimary(children, `${current}-solo-${roots.length}`)
}

export async function unmount(root: TestRoot) {
  await act(async () => root.unmount())
  await act(async () => {})
}
