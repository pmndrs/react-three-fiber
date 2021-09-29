import { UseStore } from 'zustand'
// @ts-ignore
import { ContinuousEventPriority, DiscreteEventPriority, DefaultEventPriority } from 'react-reconciler/constants'
import { RootState } from '../core/store'
import { EventManager, Events } from '../core/events'
import { createEvents } from '../core/events'

const CLICK = 'click'
const CONTEXTMENU = 'contextmenu'
const DBLCLICK = 'dblclick'
const POINTERCANCEL = 'pointercancel'
const POINTERDOWN = 'pointerdown'
const POINTERUP = 'pointerup'
const POINTERMOVE = 'pointermove'
const POINTEROUT = 'pointerout'
const POINTEROVER = 'pointerover'
const POINTERENTER = 'pointerenter'
const POINTERLEAVE = 'pointerleave'
const WHEEL = 'wheel'

// https://github.com/facebook/react/tree/main/packages/react-reconciler#getcurrenteventpriority
// Gives React a clue as to how import the current interaction is
export function getEventPriority() {
  let name = window?.event?.type
  switch (name) {
    case CLICK:
    case CONTEXTMENU:
    case DBLCLICK:
    case POINTERCANCEL:
    case POINTERDOWN:
    case POINTERUP:
      return DiscreteEventPriority
    case POINTERMOVE:
    case POINTEROUT:
    case POINTEROVER:
    case POINTERENTER:
    case POINTERLEAVE:
    case WHEEL:
      return ContinuousEventPriority
    default:
      return DefaultEventPriority
  }
}

export function createPointerEvents(store: UseStore<RootState>): EventManager<HTMLElement> {
  const { handlePointer } = createEvents(store)
  const names = {
    onClick: [CLICK, false],
    onContextMenu: [CONTEXTMENU, false],
    onDoubleClick: [DBLCLICK, false],
    onWheel: [WHEEL, true],
    onPointerDown: [POINTERDOWN, true],
    onPointerUp: [POINTERUP, true],
    onPointerLeave: [POINTERLEAVE, true],
    onPointerMove: [POINTERMOVE, true],
    onPointerCancel: [POINTERCANCEL, true],
    onLostPointerCapture: ['lostpointercapture', true],
  } as const

  return {
    connected: false,
    handlers: Object.keys(names).reduce((acc, key) => ({ ...acc, [key]: handlePointer(key) }), {}) as unknown as Events,
    connect: (target: HTMLElement) => {
      const { set, events } = store.getState()
      events.disconnect?.()
      set((state) => ({ events: { ...state.events, connected: target } }))
      Object.entries(events?.handlers ?? []).forEach(([name, event]) => {
        const [eventName, passive] = names[name as keyof typeof names]
        target.addEventListener(eventName, event, { passive })
      })
    },
    disconnect: () => {
      const { set, events } = store.getState()
      if (events.connected) {
        Object.entries(events.handlers ?? []).forEach(([name, event]) => {
          if (events && events.connected instanceof HTMLElement) {
            const [eventName] = names[name as keyof typeof names]
            events.connected.removeEventListener(eventName, event)
          }
        })
        set((state) => ({ events: { ...state.events, connected: false } }))
      }
    },
  }
}
