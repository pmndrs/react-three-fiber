import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'
import * as THREE from 'three'
import { extend } from '../src'

// Polyfills WebGL canvas
function getContext(contextId: '2d', options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null
function getContext(
  contextId: 'bitmaprenderer',
  options?: ImageBitmapRenderingContextSettings,
): ImageBitmapRenderingContext | null
function getContext(contextId: 'webgl', options?: WebGLContextAttributes): WebGLRenderingContext | null
function getContext(contextId: 'webgl2', options?: WebGLContextAttributes): WebGL2RenderingContext | null
function getContext(contextId: string): RenderingContext | null {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return createWebGLContext(this)
  }
  return null
}

HTMLCanvasElement.prototype.getContext = getContext

// Extend catalogue for render API in tests
extend(THREE)
