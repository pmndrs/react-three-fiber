import { UseStore } from 'zustand'
import { RootState } from '../core/store'
import type { EventManager, Events } from '../core/events'
import { createEvents } from '../core/events'

export function createPointerEvents(store: UseStore<RootState>): EventManager<HTMLElement> {
  const { handlePointer } = createEvents(store)
  const names = {
    onClick: 'click',
    onContextMenu: 'contextmenu',
    onDoubleClick: 'dblclick',
    onWheel: 'wheel',
    onPointerDown: 'pointerdown',
    onPointerUp: 'pointerup',
    onPointerLeave: 'pointerleave',
    onPointerMove: 'pointermove',
    onPointerCancel: 'pointercancel',
    onLostPointerCapture: 'lostpointercapture',
  }

  return {
    connected: false,
    handlers: Object.keys(names).reduce((acc, key) => ({ ...acc, [key]: handlePointer(key) }), {}) as unknown as Events,
    connect: (target: HTMLElement) => {
      const { set, events } = store.getState()
      events.disconnect?.()
      set((state) => ({ events: { ...state.events, connected: target } }))
      // TODO: Figure out what to do with these event handlers
      // Seems to have no use yet, and it will crash on unmount due to us having no HTMLElement
      // Maybe replace this with View?
      // Object.entries(events?.handlers ?? []).forEach(([name, event]) =>
      //   target.addEventListener(names[name as keyof typeof names], event, { passive: true }),
      // )
    },
    disconnect: () => {
      const { set, events } = store.getState()
      if (events.connected) {
        // TODO: Figure out what to do with these event handlers
        // If this is uncommented, when disconnected we will get a crash saying
        // "Can't find variable: HTMLElement"
        // Object.entries(events.handlers ?? []).forEach(([name, event]) => {
        //   if (events && events.connected instanceof HTMLElement) {
        //     events.connected.removeEventListener(names[name as keyof typeof names], event)
        //   }
        // })
        set((state) => ({ events: { ...state.events, connected: false } }))
      }
    },
  }
}
