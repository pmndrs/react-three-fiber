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

// Export to make this a module (required for declare global)
export {}

//* import.meta Mock ==============================
// The scheduler uses import.meta.hot for HMR support
// During build, unbuild transforms this to import_meta_hot
// In Jest, we need to mock it since there's no bundler transformation
// @ts-ignore - defining import.meta for Jest environment
globalThis.import_meta_hot = undefined

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

// Let React know we're testing effectful components
global.IS_REACT_ACT_ENVIRONMENT = true

//* WebGL Context Mocks ==============================
// Needed for tests that render <Canvas> directly (not using createTestCanvas)
globalThis.WebGL2RenderingContext = WebGL2RenderingContext as any
globalThis.WebGLRenderingContext = class WebGLRenderingContext extends WebGL2RenderingContext {} as any

HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return new WebGL2RenderingContext(this) as any
}
