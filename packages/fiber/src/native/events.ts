import { RootState, RootStore } from '../core/store'
import { createEvents, DomEvent, EventManager, Events } from '../core/events'
import { type GestureResponderEvent, PanResponder } from 'react-native'

/** Default R3F event manager for react-native */
export function createTouchEvents(store: RootStore): EventManager<HTMLElement> {
  const { handlePointer } = createEvents(store)

  const handleTouch = (event: GestureResponderEvent, name: string): true => {
    event.persist()

    // Apply offset
    ;(event as any).nativeEvent.offsetX = event.nativeEvent.locationX
    ;(event as any).nativeEvent.offsetY = event.nativeEvent.locationY

    // Emulate DOM event
    const callback = handlePointer(name)
    callback(event.nativeEvent as any)

    return true
  }

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => true,
    onStartShouldSetPanResponderCapture: (e) => handleTouch(e, 'onPointerCapture'),
    onPanResponderStart: (e) => handleTouch(e, 'onPointerDown'),
    onPanResponderMove: (e) => handleTouch(e, 'onPointerMove'),
    onPanResponderEnd: (e, state) => {
      handleTouch(e, 'onPointerUp')
      if (Math.hypot(state.dx, state.dy) < 20) handleTouch(e, 'onClick')
    },
    onPanResponderRelease: (e) => handleTouch(e, 'onPointerLeave'),
    onPanResponderTerminate: (e) => handleTouch(e, 'onLostPointerCapture'),
    onPanResponderReject: (e) => handleTouch(e, 'onLostPointerCapture'),
  })

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
    handlers: responder.panHandlers as unknown as Events,
    update: () => {
      const { events, internal } = store.getState()
      if (internal.lastEvent?.current && events.handlers) {
        handlePointer('onPointerMove')(internal.lastEvent.current)
      }
    },
    connect: () => {
      const { set, events } = store.getState()
      events.disconnect?.()

      set((state) => ({ events: { ...state.events, connected: true } }))
    },
    disconnect: () => {
      const { set } = store.getState()

      set((state) => ({ events: { ...state.events, connected: false } }))
    },
  }
}
