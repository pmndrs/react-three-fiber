import { UseStore } from 'zustand'
// @ts-ignore
import { ContinuousEventPriority, DiscreteEventPriority, DefaultEventPriority } from 'react-reconciler/constants'
import { RootState } from '../core/store'
import { createEvents, EventManager, Events } from '../core/events'
import { View } from 'react-native'
// @ts-ignore
import { Pressability } from 'react-native/Libraries/Pressability/Pressability'

const EVENTS = {
  PRESS: 'onPress',
  PRESSIN: 'onPressIn',
  PRESSOUT: 'onPressOut',
  LONGPRESS: 'onLongPress',

  HOVERIN: 'onHoverIn',
  HOVEROUT: 'onHoverOut',
  PRESSMOVE: 'onPressMove',
}

// https://github.com/facebook/react/tree/main/packages/react-reconciler#getcurrenteventpriority
// Gives React a clue as to how import the current interaction is
export function getEventPriority() {
  let name = window?.event?.type
  switch (name) {
    case EVENTS.PRESS:
    case EVENTS.PRESSIN:
    case EVENTS.PRESSOUT:
    case EVENTS.LONGPRESS:
      return DiscreteEventPriority
    case EVENTS.HOVERIN:
    case EVENTS.HOVEROUT:
    case EVENTS.PRESSMOVE:
      return ContinuousEventPriority
    default:
      return DefaultEventPriority
  }
}

export function createTouchEvents(store: UseStore<RootState>): EventManager<View> {
  const { handlePointer } = createEvents(store)

  return {
    connected: false,
    handlers: Object.values(EVENTS).reduce(
      (acc, name) => ({ ...acc, [name]: handlePointer(name) }),
      {},
    ) as unknown as Events,
    connect: (target: View) => {
      const { set, events } = store.getState()
      events.disconnect?.()
      const manager = new Pressability(events)
      set((state) => ({ events: { ...state.events, connected: manager } }))
      Object.assign(target.props, manager.getEventHandlers())
    },
    disconnect: () => {
      const { set, events } = store.getState()
      if (events.connected) {
        events.connected.reset()
        set((state) => ({ events: { ...state.events, connected: false } }))
      }
    },
  }
}
