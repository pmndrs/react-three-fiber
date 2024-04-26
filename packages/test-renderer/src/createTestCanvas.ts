import { WebGL2RenderingContext } from './WebGL2RenderingContext'
import type { CreateCanvasParameters } from './types/internal'

export const createCanvas = ({ beforeReturn, width = 1280, height = 800 }: CreateCanvasParameters = {}) => {
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
  // @ts-ignore
  globalThis.WebGLRenderingContext ??= WebGLRenderingContext
  // @ts-ignore
  globalThis.WebGL2RenderingContext ??= WebGL2RenderingContext

  return canvas
}
