import { UseBoundStore } from 'zustand'
import { RootState } from '../core/store'
import { createEvents, DomEvent, EventManager, Events } from '../core/events'
import { GestureResponderEvent } from 'react-native'
/* eslint-disable import/default, import/no-named-as-default, import/no-named-as-default-member */
// @ts-ignore
// eslint-disable-next-line
import Pressability from 'react-native/Libraries/Pressability/Pressability'
/* eslint-enable import/default, import/no-named-as-default, import/no-named-as-default-member */

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

/** Default R3F event manager for react-native */
export function createTouchEvents(store: UseBoundStore<RootState>): EventManager<HTMLElement> {
  const { handlePointer } = createEvents(store)

  const handleTouch = (event: GestureResponderEvent, name: keyof typeof EVENTS) => {
    event.persist()

    // Apply offset
    ;(event as any).nativeEvent.offsetX = event.nativeEvent.locationX
    ;(event as any).nativeEvent.offsetY = event.nativeEvent.locationY

    // Emulate DOM event
    const callback = handlePointer(DOM_EVENTS[name])
    return callback(event.nativeEvent as any)
  }

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

      const connected = new Pressability(events.handlers)
      set((state) => ({ events: { ...state.events, connected } }))

      const handlers = connected.getEventHandlers()
      return handlers
    },
    disconnect: () => {
      const { set, events } = store.getState()

      if (events.connected) {
        events.connected.reset()
        set((state) => ({ events: { ...state.events, connected: undefined } }))
      }
    },
  }
}
