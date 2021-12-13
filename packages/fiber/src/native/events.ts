import { UseStore } from 'zustand'
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

      const connected = new Pressability(events?.handlers)
      set((state) => ({ events: { ...state.events, connected } }))

      const handlers = connected.getEventHandlers()
      return handlers
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
