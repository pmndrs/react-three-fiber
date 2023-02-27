import * as THREE from 'three'
import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'
import { extend } from '@react-three/fiber'
import 'regenerator-runtime/runtime'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

// Let React know that we'll be testing effectful components
global.IS_REACT_ACT_ENVIRONMENT = true

// Mock scheduler to test React features
jest.mock('scheduler', () => ({
  ...jest.requireActual('scheduler/unstable_mock'),
  unstable_scheduleCallback: (_: any, callback: () => void) => callback(),
}))

// ESLint is broken atm -- TypeError: The argument 'filename' must be a file URL object, file URL string, or absolute path string. Received 'http://localhost/eslintrc.cjs'
jest.mock('eslint', () => ({
  RuleTester: class {
    run() {
      it.skip('RuleTester.run', () => {})
    }
    static only() {
      it.skip('RuleTester.only', () => {})
      return {}
    }
  },
}))

// PointerEvent is not in JSDOM
// https://github.com/jsdom/jsdom/pull/2666#issuecomment-691216178
// https://w3c.github.io/pointerevents/#pointerevent-interface
if (!global.PointerEvent) {
  global.PointerEvent = class extends MouseEvent implements PointerEvent {
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

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      Object.assign(this, params)
    }

    getCoalescedEvents = () => []
    getPredictedEvents = () => []
  }
}

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
extend(THREE as any)
