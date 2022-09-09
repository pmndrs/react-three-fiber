import 'regenerator-runtime/runtime'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

// Let React know that we'll be testing effectful components
global.IS_REACT_ACT_ENVIRONMENT = true

// Mock scheduler to test React features
jest.mock('scheduler', () => require('scheduler/unstable_mock'))

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
