/**
 * Multi-canvas resize correctness — Tier 1 (jsdom).
 *
 * Regressions for #3847. Both bugs come from the same root cause: three's
 * `Renderer.setSize` / `setPixelRatio` and the backend's render-pass-descriptor cache are
 * **target-implicit** — they act on whatever `renderer._canvasTarget` currently points at — and
 * R3F is the thing swapping that pointer every frame.
 *
 * Bug 1: the primary's resize wrote through `actualRenderer.setSize`, which lands on whichever
 *        canvas happens to be active (normally a *secondary*, since they run after the primary
 *        and nothing restores the primary's target). Asserted here directly.
 *
 * Bug 2: a canvas that resizes while it is not the active target never hears its own resize, so
 *        its cached depth-stencil view goes stale and every subsequent frame raises a
 *        GPUValidationError. R3F now marks the root dirty on resize and flushes
 *        `backend.updateSize()` from the canvas-target job, the one place this root's target is
 *        guaranteed active. Only the store half is provable here — the flush itself needs a
 *        device, so it is Tier 2.
 *
 * No GPU: `CanvasTarget` and the renderer are stubs recording calls, which is enough because the
 * bug is about *which object gets called*, not what the GPU does with it.
 */
import * as THREE from 'three'
import { CanvasTarget } from 'three/webgpu'

import { createStore } from '../src/core/store'
import type { RootStore } from '../src'

const noop = () => {}

/** Records setSize/setPixelRatio calls so we can assert who got resized. */
function makeTargetSpy() {
  return {
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
  }
}

/**
 * A store wired up like one canvas of a multi-canvas page.
 * `isSecondary` distinguishes the primary from the secondaries.
 */
function makeCanvasStore({ isSecondary, withTarget = true }: { isSecondary: boolean; withTarget?: boolean }) {
  const store: RootStore = createStore(noop, noop)
  const renderer = makeTargetSpy()
  const canvasTarget = withTarget ? makeTargetSpy() : undefined

  store.setState((state) => ({
    // The resize subscription runs updateCamera() before the sizing branch, so it needs a real one.
    camera: new THREE.PerspectiveCamera() as any,
    internal: {
      ...state.internal,
      actualRenderer: renderer as any,
      canvasTarget: canvasTarget as any,
      isMultiCanvas: true,
      isSecondary,
    },
  }))

  /** Drive a resize through the store, the way the resize observer does. */
  const resize = (width: number, height: number) =>
    store.setState((state) => ({ size: { ...state.size, width, height } }))

  return { store, renderer, canvasTarget, resize }
}

describe('multi-canvas resize (#3847)', () => {
  describe('bug 1: a resize only ever touches its own canvas target', () => {
    it('primary: sizes its canvas target, never the shared renderer', async () => {
      const { renderer, canvasTarget, resize } = makeCanvasStore({ isSecondary: false })

      resize(640, 480)

      expect(canvasTarget!.setSize).toHaveBeenCalledWith(640, 480, false)
      // The stray write. `Renderer.setSize` forwards to `renderer._canvasTarget`, which in
      // multi-canvas mode is normally some *other* canvas — so this resized a secondary's
      // element to the primary's dimensions.
      expect(renderer.setSize).not.toHaveBeenCalled()
      expect(renderer.setPixelRatio).not.toHaveBeenCalled()
    })

    it('secondary: sizes its canvas target, never the shared renderer', async () => {
      const { renderer, canvasTarget, resize } = makeCanvasStore({ isSecondary: true })

      resize(320, 240)

      expect(canvasTarget!.setSize).toHaveBeenCalledWith(320, 240, false)
      expect(renderer.setSize).not.toHaveBeenCalled()
    })

    it('single-canvas (no canvas target): still sizes the renderer', async () => {
      // The WebGL / single-WebGPU-canvas path must be unchanged — with no target to own, the
      // renderer's own (target-implicit) sizing is the correct thing to drive.
      const { renderer, resize } = makeCanvasStore({ isSecondary: false, withTarget: false })

      resize(800, 600)

      expect(renderer.setSize).toHaveBeenCalledWith(800, 600, false)
    })

    it('a dpr change routes to the canvas target too', async () => {
      const { store, renderer, canvasTarget } = makeCanvasStore({ isSecondary: false })

      store.setState((state) => ({ viewport: { ...state.viewport, dpr: 2 } }))

      expect(canvasTarget!.setPixelRatio).toHaveBeenCalledWith(2)
      expect(renderer.setPixelRatio).not.toHaveBeenCalled()
    })
  })

  describe('bug 2: a resized root is marked for a descriptor flush', () => {
    it('sets canvasTargetSizeDirty so the canvas-target job can flush it', async () => {
      const { store, resize } = makeCanvasStore({ isSecondary: true })
      expect(store.getState().internal.canvasTargetSizeDirty).toBeFalsy()

      resize(380, 149)

      // The flag, not a direct backend.updateSize() call: updateSize() acts on
      // getCanvasTarget(), so calling it here would invalidate whichever canvas is *currently*
      // active rather than the one that just resized.
      expect(store.getState().internal.canvasTargetSizeDirty).toBe(true)
    })

    it('is not set when nothing actually changed size', async () => {
      const { store } = makeCanvasStore({ isSecondary: true })

      // A store write that leaves width/height/dpr alone must not mark the descriptor stale.
      store.setState((state) => ({ size: { ...state.size } }))

      expect(store.getState().internal.canvasTargetSizeDirty).toBeFalsy()
    })
  })

  // The flush itself — canvas-target job calls setCanvasTarget then backend.updateSize(), and
  // the depth attachment stops mismatching the colour attachment — needs a real device.
  it.todo('covered by Tier 2: a secondary resizing while inactive no longer raises GPUValidationError')
})

/**
 * A stand-in for three's Renderer that keeps its *real* contract with CanvasTarget: sizing is
 * target-implicit (forwards to `_canvasTarget`), the drawing buffer -- and so the depth buffer --
 * is read from that same target, and the resize listener rides along with setCanvasTarget.
 */
function makeForwardingRenderer(canvas: HTMLCanvasElement) {
  const backend = { updateSize: vi.fn() }
  const onResize = () => backend.updateSize()
  const defaultTarget = new CanvasTarget(canvas)
  defaultTarget.addEventListener('resize', onResize)
  const renderer = {
    backend,
    _canvasTarget: defaultTarget,
    getCanvasTarget: () => renderer._canvasTarget,
    setCanvasTarget(target: CanvasTarget) {
      renderer._canvasTarget.removeEventListener('resize', onResize)
      renderer._canvasTarget = target
      target.addEventListener('resize', onResize)
    },
    setSize: (w: number, h: number, updateStyle?: boolean) => renderer._canvasTarget.setSize(w, h, updateStyle),
    setPixelRatio: (dpr: number) => renderer._canvasTarget.setPixelRatio(dpr),
    getDrawingBufferSize: () => renderer._canvasTarget.getDrawingBufferSize(new THREE.Vector2()),
  }
  return { renderer, defaultTarget }
}

function makeStoreFor(renderer: object, canvasTarget: CanvasTarget, extra: Record<string, unknown> = {}) {
  const store: RootStore = createStore(noop, noop)
  store.setState((state) => ({
    camera: new THREE.PerspectiveCamera() as any,
    internal: { ...state.internal, actualRenderer: renderer as any, canvasTarget, ...extra },
  }))
  return store
}

describe('a lone primary owns the renderer default target (alpha.4 regression of #3847)', () => {
  // The alpha.4 fix routed a primary's resize to `internal.canvasTarget`, which was a *second*
  // CanvasTarget wrapped around the same element. three only sizes, listens to and builds the
  // depth buffer for its own `_canvasTarget`; with no secondary to flip isMultiCanvas nothing
  // ever made the wrapper active, so the swap chain followed the layout while the renderer's
  // depth buffer stayed at the element's construction size (300x150):
  //   "The depth stencil attachment size (300, 150) does not match the size of the other
  //    attachments (1288, 1196)".
  // The primary's target is now the renderer's own default target, so there is nothing to
  // desync.
  it("a resize on the primary's target is a resize of the renderer's drawing buffer", () => {
    const canvas = document.createElement('canvas')
    const { renderer, defaultTarget } = makeForwardingRenderer(canvas)
    const store = makeStoreFor(renderer, defaultTarget)

    store.setState((state) => ({ viewport: { ...state.viewport, dpr: 2 } }))
    store.setState((state) => ({ size: { ...state.size, width: 644, height: 598 } }))

    // The depth buffer is sized from exactly this call. (The element's own width/height are
    // pinned by the test canvas mock, so the target's drawing buffer is the observable here.)
    expect(renderer.getDrawingBufferSize()).toEqual(new THREE.Vector2(1288, 1196))
  })

  it('does not flag a descriptor flush the renderer already performed', () => {
    const canvas = document.createElement('canvas')
    const { renderer, defaultTarget } = makeForwardingRenderer(canvas)
    const store = makeStoreFor(renderer, defaultTarget)

    store.setState((state) => ({ size: { ...state.size, width: 640, height: 480 } }))

    // Our target was the active one, so three's own resize listener flushed synchronously.
    expect(renderer.backend.updateSize).toHaveBeenCalled()
    expect(store.getState().internal.canvasTargetSizeDirty).toBeFalsy()
  })

  it('still flags the flush when some other canvas holds the renderer', () => {
    const canvas = document.createElement('canvas')
    const { renderer, defaultTarget } = makeForwardingRenderer(canvas)
    const store = makeStoreFor(renderer, defaultTarget, { isMultiCanvas: true })
    // A secondary rendered last frame and left its target active, as they do.
    renderer.setCanvasTarget(new CanvasTarget(document.createElement('canvas')))
    renderer.backend.updateSize.mockClear()

    store.setState((state) => ({ size: { ...state.size, width: 640, height: 480 } }))

    // Nobody heard the resize, and the secondary's target was left alone (#3847 bug 1).
    expect(renderer.backend.updateSize).not.toHaveBeenCalled()
    expect(store.getState().internal.canvasTargetSizeDirty).toBe(true)
    expect(defaultTarget.getDrawingBufferSize(new THREE.Vector2())).toEqual(new THREE.Vector2(640, 480))
    expect(renderer.getDrawingBufferSize()).toEqual(new THREE.Vector2(1280, 800))
  })
})
