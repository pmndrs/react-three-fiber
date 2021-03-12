// PointerEvent is not in JSDOM
// https://github.com/jsdom/jsdom/pull/2666#issuecomment-691216178
export const pointerEventPolyfill = () => {
  if (!global.PointerEvent) {
    class PointerEvent extends MouseEvent {
      public height?: number
      public isPrimary?: boolean
      public pointerId?: number
      public pointerType?: string
      public pressure?: number
      public tangentialPressure?: number
      public tiltX?: number
      public tiltY?: number
      public twist?: number
      public width?: number

      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params)
        this.pointerId = params.pointerId
        this.width = params.width
        this.height = params.height
        this.pressure = params.pressure
        this.tangentialPressure = params.tangentialPressure
        this.tiltX = params.tiltX
        this.tiltY = params.tiltY
        this.pointerType = params.pointerType
        this.isPrimary = params.isPrimary
      }
    }
    global.PointerEvent = PointerEvent as any
  }
}
