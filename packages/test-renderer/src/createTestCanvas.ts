import type { CreateCanvasParameters } from './types/internal'

export const createCanvas = ({ beforeReturn, width = 1280, height = 800 }: CreateCanvasParameters = {}) => {
  const canvas = document.createElement('canvas')
  canvas.height = height
  canvas.width = width

  canvas.addEventListener = () => {}
  canvas.removeEventListener = () => {}

  if (beforeReturn) {
    beforeReturn(canvas)
  }

  return canvas
}
