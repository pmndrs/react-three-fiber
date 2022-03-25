import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'
import * as THREE from 'three'
import { extend } from '../src'

// Polyfills WebGL canvas
// @ts-ignore
HTMLCanvasElement.prototype.getContext = function () {
  return createWebGLContext(this)
}

// Extend catalogue for render API in tests
extend(THREE)
