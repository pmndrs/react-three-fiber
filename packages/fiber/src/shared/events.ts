import { UseStore } from 'zustand'
import { RootState } from '../core/store'
import { EventManager, Events, createEvents } from '../core/events'

const DOM_EVENTS = {
  onClick: ['click', false],
  onContextMenu: ['contextmenu', false],
  onDoubleClick: ['dblclick', false],
  onWheel: ['wheel', true],
  onPointerDown: ['pointerdown', true],
  onPointerUp: ['pointerup', true],
  onPointerLeave: ['pointerleave', true],
  onPointerMove: ['pointermove', true],
  onPointerCancel: ['pointercancel', true],
  onLostPointerCapture: ['lostpointercapture', true],
} as const

export function createPointerEvents(store: UseStore<RootState>): EventManager<HTMLElement> {
  const { handlePointer } = createEvents(store)

  return {
    connected: false,
    handlers: Object.keys(DOM_EVENTS).reduce(
      (acc, key) => ({ ...acc, [key]: handlePointer(key) }),
      {},
    ) as unknown as Events,
    connect: (target: HTMLElement) => {
      const { set, events } = store.getState()
      events.disconnect?.()
      set((state) => ({ events: { ...state.events, connected: target } }))
      Object.entries(events?.handlers ?? []).forEach(([name, event]) => {
        const [eventName, passive] = DOM_EVENTS[name as keyof typeof DOM_EVENTS]
        target.addEventListener(eventName, event, { passive })
      })
    },
    disconnect: () => {
      const { set, events } = store.getState()
      if (events.connected) {
        Object.entries(events.handlers ?? []).forEach(([name, event]) => {
          if (events && events.connected instanceof HTMLElement) {
            const [eventName] = DOM_EVENTS[name as keyof typeof DOM_EVENTS]
            events.connected.removeEventListener(eventName, event)
          }
        })
        set((state) => ({ events: { ...state.events, connected: false } }))
      }
    },
  }
}
