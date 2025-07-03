import { WebGL2RenderingContext } from './WebGL2RenderingContext'
import type { CreateCanvasParameters } from './types/internal'

// Default test canvas dimensions
export const DEFAULT_TEST_CANVAS_WIDTH = 1280
export const DEFAULT_TEST_CANVAS_HEIGHT = 800

export const createCanvas = ({
  beforeReturn,
  width = DEFAULT_TEST_CANVAS_WIDTH,
  height = DEFAULT_TEST_CANVAS_HEIGHT,
}: CreateCanvasParameters = {}) => {
  let canvas: HTMLCanvasElement

  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    canvas = document.createElement('canvas')
  } else {
    canvas = {
      style: {},
      addEventListener: (() => {}) as any,
      removeEventListener: (() => {}) as any,
      clientWidth: width,
      clientHeight: height,
      getContext: (() => new WebGL2RenderingContext(canvas)) as any,
    } as HTMLCanvasElement
  }
  canvas.width = width
  canvas.height = height

  if (globalThis.HTMLCanvasElement) {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (id: string) {
      if (id.startsWith('webgl')) return new WebGL2RenderingContext(this)
      return getContext.apply(this, arguments as any)
    } as any
  }

  beforeReturn?.(canvas)

  class WebGLRenderingContext extends WebGL2RenderingContext {}
  // @ts-expect-error
  globalThis.WebGLRenderingContext ??= WebGLRenderingContext
  // @ts-expect-error
  globalThis.WebGL2RenderingContext ??= WebGL2RenderingContext

  return canvas
}
