import { UseStore } from 'zustand'
// @ts-ignore
import { ContinuousEventPriority, DiscreteEventPriority, DefaultEventPriority } from 'react-reconciler/constants'
import { RootState } from '../core/store'
import { createEvents, EventManager, Events } from '../core/events'
import { GestureResponderEvent, View } from 'react-native'
// @ts-ignore
import Pressability from 'react-native/Libraries/Pressability/Pressability'

const EVENTS = {
  PRESS: 'onPress',
  PRESSIN: 'onPressIn',
  PRESSOUT: 'onPressOut',
  LONGPRESS: 'onLongPress',

  HOVERIN: 'onHoverIn',
  HOVEROUT: 'onHoverOut',
  PRESSMOVE: 'onPressMove',
}

const DOM_EVENTS = {
  [EVENTS.PRESS]: 'onClick',
  [EVENTS.PRESSIN]: 'onPointerDown',
  [EVENTS.PRESSOUT]: 'onPointerUp',
  [EVENTS.LONGPRESS]: 'onDoubleClick',

  [EVENTS.HOVERIN]: 'onPointerOver',
  [EVENTS.HOVEROUT]: 'onPointerOut',
  [EVENTS.PRESSMOVE]: 'onPointerMove',
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

  const handleTouch = (event: GestureResponderEvent, name: keyof typeof EVENTS) => {
    event.persist()

    // Apply offset
    ;(event as any).nativeEvent.offsetX = event.nativeEvent.pageX
    ;(event as any).nativeEvent.offsetY = event.nativeEvent.pageY

    // Emulate DOM event
    const callback = handlePointer(DOM_EVENTS[name])
    return callback(event.nativeEvent as any)
  }

  return {
    connected: false,
    handlers: Object.values(EVENTS).reduce(
      (acc, name) => ({
        ...acc,
        [name]: (event: GestureResponderEvent) => handleTouch(event, name as keyof typeof EVENTS),
      }),
      {},
    ) as unknown as Events,
    connect: () => {
      const { set, events } = store.getState()
      events.disconnect?.()

      const manager = new Pressability(events?.handlers)

      set((state) => ({ events: { ...state.events, connected: manager } }))
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
