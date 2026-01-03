/**
 * @fileoverview Test setup for fiber tests
 *
 * Sets up:
 * - React act environment flag
 * - WebGL context mocks (needed for <Canvas> tests)
 * - import.meta mock (for HMR code in scheduler.ts)
 *
 * NOTE: THREE auto-extend is handled by entry points (index, legacy, webgpu)
 * NOTE: PointerEvent polyfill is in events.test.tsx (only test that needs it)
 */
import { WebGL2RenderingContext } from '../../test-renderer/src/WebGL2RenderingContext'
import { vi } from 'vitest'

// Mock react-use-measure globally for tests
vi.mock('react-use-measure', () => ({
  default: vi.fn(() => [() => {}, { width: 1280, height: 800, top: 0, left: 0, bottom: 800, right: 1280, x: 0, y: 0 }]),
}))
export {}

//* import.meta Mock ==============================
// The scheduler uses import.meta.hot for HMR support
// During build, unbuild transforms this to import_meta_hot
// In Jest, we need to mock it since there's no bundler transformation
// @ts-ignore - defining import.meta for Jest environment
globalThis.import_meta_hot = undefined

// Let React know we're testing effectful components
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true

//* Suppress Three.js Multiple Instances Warning ==============================
// Jest loads three.cjs and three.core.js as separate instances due to module resolution.
// In production, bundlers deduplicate these, so this warning is Jest-specific noise.
const originalWarn = console.warn
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Multiple instances of Three.js')) {
    return
  }
  originalWarn.apply(console, args)
}

// WebGL Context Mocks
// Needed for tests that render <Canvas> directly (not using createTestCanvas)
globalThis.WebGL2RenderingContext = WebGL2RenderingContext as any
globalThis.WebGLRenderingContext = class WebGLRenderingContext extends WebGL2RenderingContext {} as any

HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return new WebGL2RenderingContext(this) as any
}

// ResizeObserver Polyfill
globalThis.ResizeObserver = class ResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe(element: HTMLElement) {
    // Synchronously trigger callback with mock dimensions from getBoundingClientRect
    const rect = element.getBoundingClientRect()
    this.callback(
      [
        {
          target: element,
          contentRect: rect,
          borderBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
          contentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
          devicePixelContentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
        },
      ],
      this,
    )
  }
  unobserve() {}
  disconnect() {}
} as any

//* PointerEvent Polyfill ==============================
// JSDOM doesn't include PointerEvent
// https://github.com/jsdom/jsdom/pull/2666#issuecomment-691216178
if (!global.PointerEvent) {
  // @ts-ignore
  global.PointerEvent = class PointerEvent extends MouseEvent {
    readonly pointerId: number = 0
    readonly width: number = 1
    readonly height: number = 1
    readonly pressure: number = 0
    readonly tangentialPressure: number = 0
    readonly tiltX: number = 0
    readonly tiltY: number = 0
    readonly twist: number = 0
    readonly pointerType: string = ''
    readonly isPrimary: boolean = false
    readonly altitudeAngle: number = 0
    readonly azimuthAngle: number = 0

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      Object.assign(this, params)
    }

    getCoalescedEvents = () => []
    getPredictedEvents = () => []
  }
}

// Mock getBoundingClientRect so rays have a non-zero canvas to hit
Object.defineProperties(HTMLCanvasElement.prototype, {
  getBoundingClientRect: {
    value: () => ({
      width: 1280,
      height: 800,
      top: 0,
      left: 0,
      bottom: 800,
      right: 1280,
      x: 0,
      y: 0,
    }),
  },
  width: { get: () => 1280, set: () => {} },
  height: { get: () => 800, set: () => {} },
  clientWidth: { get: () => 1280 },
  clientHeight: { get: () => 800 },
})
