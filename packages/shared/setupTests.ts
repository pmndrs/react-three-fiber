import * as THREE from 'three'
import { WebGL2RenderingContext } from '@react-three/test-renderer/src/WebGL2RenderingContext'
import { extend } from '@react-three/fiber'
import 'regenerator-runtime/runtime'

const error = console.error
console.error = function () {
  const message = Array.from(arguments).join('')
  if (message.includes('Expected host context to exist')) return

  return error.apply(this, arguments as any)
}

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

// Let React know that we'll be testing effectful components
global.IS_REACT_ACT_ENVIRONMENT = true

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

globalThis.WebGL2RenderingContext = WebGL2RenderingContext as any
globalThis.WebGLRenderingContext = class WebGLRenderingContext extends WebGL2RenderingContext {} as any

HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return new WebGL2RenderingContext(this) as any
}

// Extend catalogue for render API in tests
extend(THREE as any)
