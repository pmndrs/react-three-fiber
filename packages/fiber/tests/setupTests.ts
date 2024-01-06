import { WebGL2RenderingContext } from '@react-three/test-renderer/src/WebGL2RenderingContext'
import * as THREE from 'three'
import { extend } from '../src'

globalThis.WebGL2RenderingContext = WebGL2RenderingContext as any
globalThis.WebGLRenderingContext = class WebGLRenderingContext extends WebGL2RenderingContext {} as any

HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return new WebGL2RenderingContext(this) as any
}

// Extend catalogue for render API in tests
extend(THREE)
