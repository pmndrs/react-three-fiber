import type { EventHandlers } from '../types/internal'
import { invert } from './object'

const EVENT_HANDLER_TO_NAME: Record<keyof EventHandlers, string> = {
  onClick: 'click',
  onContextMenu: 'contextmenu',
  onDoubleClick: 'doubleclick',
  onPointerUp: 'pointerup',
  onPointerDown: 'pointerdown',
  onPointerOver: 'pointerover',
  onPointerOut: 'pointerout',
  onPointerEnter: 'pointerenter',
  onPointerLeave: 'pointerleave',
  onPointerMove: 'pointermove',
  onPointerMissed: 'pointermissed',
  onPointerCancel: 'pointercancel',
  onWheel: 'wheel',
}

export const lowerCaseFirstLetter = (str: string) => `${str.charAt(0).toLowerCase()}${str.slice(1)}`

export const toEventHandlerName = (eventName: string) => {
  const eventNameToHandler = invert(EVENT_HANDLER_TO_NAME)

  if (!(eventName in eventNameToHandler)) throw new Error(`Unsupported event name: ${eventName}`)

  return eventNameToHandler[eventName]
}
