import { WebGL2RenderingContext } from './WebGL2RenderingContext'
import type { CreateCanvasParameters } from './types/internal'

export const createCanvas = ({ beforeReturn, width = 1280, height = 800 }: CreateCanvasParameters = {}) => {
  const canvas =
    typeof document !== 'undefined' && typeof document.createElement === 'function'
      ? document.createElement('canvas')
      : ({
          style: {},
          addEventListener: (() => {}) as any,
          removeEventListener: (() => {}) as any,
          clientWidth: width,
          clientHeight: height,
          getContext: (() => new WebGL2RenderingContext(canvas)) as any,
        } as HTMLCanvasElement)
  canvas.width = width
  canvas.height = height

  beforeReturn?.(canvas)

  class WebGLRenderingContext extends WebGL2RenderingContext {}
  // @ts-ignore
  globalThis.WebGLRenderingContext ??= WebGLRenderingContext
  // @ts-ignore
  globalThis.WebGL2RenderingContext ??= WebGL2RenderingContext

  return canvas
}
