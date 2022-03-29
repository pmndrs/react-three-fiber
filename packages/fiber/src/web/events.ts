import { UseBoundStore } from 'zustand'
import { RootState } from '../core/store'
import { EventManager, Events, createEvents, DomEvent } from '../core/events'

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

export function createPointerEvents(store: UseBoundStore<RootState>): EventManager<HTMLElement> {
  const { handlePointer } = createEvents(store)

  return {
    priority: 1,
    enabled: true,
    compute(event: DomEvent, state: RootState, previous?: RootState) {
      // https://github.com/pmndrs/react-three-fiber/pull/782
      // Events trigger outside of canvas when moved, use offsetX/Y by default and allow overrides
      state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    },

    connected: undefined,
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
        set((state) => ({ events: { ...state.events, connected: undefined } }))
      }
    },
  }
}
