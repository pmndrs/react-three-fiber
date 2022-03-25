import { UseBoundStore } from 'zustand'
import { RootState } from '../core/store'
import type { EventManager, Events } from '../core/events'
import { createEvents } from '../core/events'

export function createPointerEvents(store: UseBoundStore<RootState>): EventManager<HTMLElement> {
  const { handlePointer } = createEvents(store)
  const names = {
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
