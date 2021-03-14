import ReactReconciler from 'react-reconciler'
import type { Camera } from 'react-three-fiber'

import { toEventHandlerName } from './helpers/strings'

import type { MockSceneChild, MockUseStoreState } from './createMockStore'

/**
 * this is an empty object of any,
 * the data is passed to a new event
 * and subsequently passed to the
 * event handler you're calling
 */
export type MockEventData = {
  [key: string]: any
}

export type MockSyntheticEvent = {
  camera: Camera
  stopPropagation: () => void
  target: MockSceneChild
  currentTarget: MockSceneChild
  sourceEvent: MockEventData
  [key: string]: any
}

export const createEventFirer = (
  act: ReactReconciler.Reconciler<unknown, unknown, unknown, unknown, unknown>['act'],
  store: MockUseStoreState,
) => {
  const findEventHandler = (
    element: MockSceneChild,
    eventName: string,
  ): ((event: MockSyntheticEvent) => any) | null => {
    const eventHandlerName = toEventHandlerName(eventName)

    const props = element.__r3f.memoizedProps

    if (typeof props[eventHandlerName] === 'function') {
      return props[eventHandlerName]
    }

    if (typeof props[eventName] === 'function') {
      return props[eventName]
    }

    return null
  }

  const createSyntheticEvent = (element: MockSceneChild, data: MockEventData): MockSyntheticEvent => {
    const raycastEvent = {
      camera: store.getState().camera,
      stopPropagation: () => {},
      target: { ...element },
      currentTarget: { ...element },
      sourceEvent: data,
      ...data,
    }
    return raycastEvent
  }

  const invokeEvent = async (element: MockSceneChild, eventName: string, data: MockEventData): Promise<any> => {
    const handler = findEventHandler(element, eventName)

    if (!handler) {
      return
    }

    let returnValue: any

    await act(async () => {
      returnValue = handler(createSyntheticEvent(element, data))
    })

    return returnValue
  }

  const fireEvent = async (element: MockSceneChild, eventName: string, data: MockEventData = {}): Promise<any> =>
    await invokeEvent(element, eventName, data)

  return fireEvent
}
