/**
 * @fileoverview External Renderer Tests
 *
 * Tests for external renderer support - verifying that users can pass
 * pre-created or pre-initialized renderers to Canvas/createRoot.
 *
 * @see https://github.com/pmndrs/react-three-fiber/issues/3651
 */
import * as React from 'react'
import * as THREE from 'three'
import { ReconcilerRoot, createRoot, act, extend, useThree } from '../src/index'

extend(THREE as any)

//* Mock Renderer ==============================
// Mock renderer that simulates WebGPU-style renderer with init/hasInitialized

class MockWebGPURenderer {
  canvas: HTMLCanvasElement
  private _initialized = false
  initCallCount = 0
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

  async init() {
    this.initCallCount++
    this._initialized = true
    return Promise.resolve()
  }

  hasInitialized() {
    return this._initialized
  }

  render(_scene: THREE.Scene, _camera: THREE.Camera) {
    // Mock render
  }

  forceContextLoss() {}
  dispose() {}
  setSize() {}
  setPixelRatio() {}
}

//* Test Suite ==============================

describe('external renderer support', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!
  let canvas: HTMLCanvasElement

  beforeEach(() => {
    canvas = document.createElement('canvas')
    root = createRoot(canvas)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
  })

  //* External Renderer Instance Tests ==============================

  describe('external renderer instance', () => {
    it('should accept an external renderer instance', async () => {
      const externalRenderer = new MockWebGPURenderer({ canvas })
      let storeRenderer: any = null

      function CaptureRenderer() {
        const state = useThree()
        storeRenderer = state.internal.actualRenderer
        return null
      }

      await act(async () =>
        (await root.configure({ renderer: externalRenderer, frameloop: 'never' })).render(<CaptureRenderer />),
      )

      // The external renderer should be used
      expect(storeRenderer).toBe(externalRenderer)
    })

    it('should call init() on uninitialized external renderer', async () => {
      const externalRenderer = new MockWebGPURenderer({ canvas })

      // Verify not initialized
      expect(externalRenderer.hasInitialized()).toBe(false)
      expect(externalRenderer.initCallCount).toBe(0)

      await act(async () => (await root.configure({ renderer: externalRenderer, frameloop: 'never' })).render(null))

      // init() should have been called
      expect(externalRenderer.initCallCount).toBe(1)
      expect(externalRenderer.hasInitialized()).toBe(true)
    })

    it('should NOT call init() on already-initialized external renderer', async () => {
      const externalRenderer = new MockWebGPURenderer({ canvas })

      // Pre-initialize the renderer
      await externalRenderer.init()
      expect(externalRenderer.hasInitialized()).toBe(true)
      expect(externalRenderer.initCallCount).toBe(1)

      await act(async () => (await root.configure({ renderer: externalRenderer, frameloop: 'never' })).render(null))

      // init() should NOT have been called again
      expect(externalRenderer.initCallCount).toBe(1)
    })

    it('should store external renderer in state.internal.actualRenderer', async () => {
      const externalRenderer = new MockWebGPURenderer({ canvas })
      let actualRenderer: any = null

      function CaptureState() {
        const state = useThree()
        actualRenderer = state.internal.actualRenderer
        return null
      }

      await act(async () =>
        (await root.configure({ renderer: externalRenderer, frameloop: 'never' })).render(<CaptureState />),
      )

      expect(actualRenderer).toBe(externalRenderer)
    })
  })

  //* Factory Function Tests ==============================

  describe('renderer factory function', () => {
    it('should accept a factory function that returns a renderer', async () => {
      const externalRenderer = new MockWebGPURenderer({ canvas })
      const factory = vi.fn(() => externalRenderer)

      let storeRenderer: any = null

      function CaptureRenderer() {
        const state = useThree()
        storeRenderer = state.internal.actualRenderer
        return null
      }

      await act(async () =>
        (await root.configure({ renderer: factory, frameloop: 'never' })).render(<CaptureRenderer />),
      )

      // Factory should have been called
      expect(factory).toHaveBeenCalled()
      // The renderer from factory should be used
      expect(storeRenderer).toBe(externalRenderer)
    })

    it('should pass default props to factory function', async () => {
      const externalRenderer = new MockWebGPURenderer({ canvas })
      let receivedProps: any = null

      const factory = vi.fn((defaultProps: any) => {
        receivedProps = defaultProps
        return externalRenderer
      })

      await act(async () => (await root.configure({ renderer: factory, frameloop: 'never' })).render(null))

      // Factory should receive default props including canvas
      expect(receivedProps).toBeDefined()
      expect(receivedProps.canvas).toBe(canvas)
    })

    it('should accept an async factory function', async () => {
      const externalRenderer = new MockWebGPURenderer({ canvas })

      const asyncFactory = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return externalRenderer
      })

      let storeRenderer: any = null

      function CaptureRenderer() {
        const state = useThree()
        storeRenderer = state.internal.actualRenderer
        return null
      }

      await act(async () =>
        (await root.configure({ renderer: asyncFactory, frameloop: 'never' })).render(<CaptureRenderer />),
      )

      // Async factory should have been called and awaited
      expect(asyncFactory).toHaveBeenCalled()
      expect(storeRenderer).toBe(externalRenderer)
    })
  })

  //* Renderer Props Object Tests ==============================

  describe('renderer props object', () => {
    it('should create renderer from props object', async () => {
      // When passing a plain object (not a renderer instance), it should
      // be merged with default props to create a new renderer
      // This test verifies the props path works (non-instance, non-function)
      let actualRenderer: any = null

      function CaptureState() {
        const state = useThree()
        actualRenderer = state.internal.actualRenderer
        return null
      }

      // Pass empty object - should use defaults
      await act(async () => (await root.configure({ renderer: {}, frameloop: 'never' })).render(<CaptureState />))

      // A renderer should have been created
      expect(actualRenderer).toBeDefined()
      expect(typeof actualRenderer.render).toBe('function')
    })
  })

  //* Re-configure Tests ==============================

  describe('re-configuration', () => {
    it('should not re-create renderer on re-configure', async () => {
      const externalRenderer = new MockWebGPURenderer({ canvas })

      await act(async () => (await root.configure({ renderer: externalRenderer, frameloop: 'never' })).render(null))

      const initialInitCount = externalRenderer.initCallCount

      // Re-configure with different options (simulating resize)
      await act(async () =>
        root.configure({
          renderer: externalRenderer,
          frameloop: 'never',
          size: { width: 200, height: 200, top: 0, left: 0 },
        }),
      )

      // init() should not be called again
      expect(externalRenderer.initCallCount).toBe(initialInitCount)
    })
  })
})
