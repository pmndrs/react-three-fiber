/**
 * @fileoverview Test Canvas Creation
 *
 * Creates a mock canvas element for testing R3F scenes without a browser.
 * Supports both WebGL and WebGPU rendering contexts.
 */

import { WebGL2RenderingContext } from './WebGL2RenderingContext'
import { MockGPUCanvasContext } from './WebGPUContext'
import type { CreateCanvasParameters, RendererMode } from './types/internal'

//* WebGL Context Setup ==============================

/**
 * Sets up WebGL context mocking on the canvas prototype
 */
function setupWebGLMocking(canvas: HTMLCanvasElement): void {
  if (globalThis.HTMLCanvasElement) {
    const originalGetContext = HTMLCanvasElement.prototype.getContext

    HTMLCanvasElement.prototype.getContext = function (id: string, options?: any) {
      if (id.startsWith('webgl')) {
        return new WebGL2RenderingContext(this)
      }
      return (originalGetContext as any).call(this, id, options)
    } as any
  }

  // Ensure global WebGL classes exist
  class WebGLRenderingContext extends WebGL2RenderingContext {}
  // @ts-expect-error - Polyfilling global
  globalThis.WebGLRenderingContext ??= WebGLRenderingContext
  // @ts-expect-error - Polyfilling global
  globalThis.WebGL2RenderingContext ??= WebGL2RenderingContext
}

//* WebGPU Context Setup ==============================

/**
 * Sets up WebGPU context mocking on the canvas prototype
 */
function setupWebGPUMocking(canvas: HTMLCanvasElement): void {
  if (globalThis.HTMLCanvasElement) {
    const originalGetContext = HTMLCanvasElement.prototype.getContext

    HTMLCanvasElement.prototype.getContext = function (id: string, options?: any) {
      // Handle WebGPU context requests
      if (id === 'webgpu') {
        return new MockGPUCanvasContext(this) as any
      }
      // Also handle WebGL for fallback scenarios
      if (id.startsWith('webgl')) {
        return new WebGL2RenderingContext(this)
      }
      return (originalGetContext as any).call(this, id, options)
    } as any
  }

  // Ensure global WebGL classes still exist (for fallback)
  class WebGLRenderingContext extends WebGL2RenderingContext {}
  // @ts-expect-error - Polyfilling global
  globalThis.WebGLRenderingContext ??= WebGLRenderingContext
  // @ts-expect-error - Polyfilling global
  globalThis.WebGL2RenderingContext ??= WebGL2RenderingContext
}

//* Canvas Creation ==============================

/**
 * Creates a mock canvas element for testing
 *
 * @param options - Configuration options
 * @param options.beforeReturn - Callback to modify canvas before returning
 * @param options.width - Canvas width (default: 1280)
 * @param options.height - Canvas height (default: 800)
 * @param options.mode - Renderer mode: 'webgl' (default) or 'webgpu'
 */
export const createCanvas = ({
  beforeReturn,
  width = 1280,
  height = 800,
  mode = 'webgl',
}: CreateCanvasParameters = {}): HTMLCanvasElement => {
  let canvas: HTMLCanvasElement

  // Create canvas - real DOM element or mock object
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    canvas = document.createElement('canvas')
  } else {
    // Node.js environment - create mock canvas
    canvas = createMockCanvas(width, height, mode)
  }

  canvas.width = width
  canvas.height = height

  // Setup context mocking based on mode
  if (mode === 'webgpu') {
    setupWebGPUMocking(canvas)
  } else {
    setupWebGLMocking(canvas)
  }

  // Allow consumer to modify canvas
  beforeReturn?.(canvas)

  return canvas
}

//* Mock Canvas for Node.js ==============================

/**
 * Creates a mock canvas object for Node.js environments
 */
function createMockCanvas(width: number, height: number, mode: RendererMode): HTMLCanvasElement {
  const canvas = {
    style: {},
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    addEventListener: (() => {}) as any,
    removeEventListener: (() => {}) as any,
    getContext: ((id: string) => {
      if (mode === 'webgpu' && id === 'webgpu') {
        return new MockGPUCanvasContext(canvas as any)
      }
      if (id.startsWith('webgl')) {
        return new WebGL2RenderingContext(canvas as any)
      }
      return null
    }) as any,
    // Additional properties that Three.js might check
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
    // For WebGPU texture creation
    transferControlToOffscreen: () => ({
      width,
      height,
      getContext: (id: string) => {
        if (id === 'webgpu') return new MockGPUCanvasContext(canvas as any)
        return null
      },
    }),
  } as HTMLCanvasElement

  return canvas
}

export type { CreateCanvasParameters, RendererMode }
