import ReactReconciler from 'react-reconciler'

import { toEventHandlerName } from './helpers/strings'

import { ReactThreeTestInstance } from './createTestInstance'

import type { MockSyntheticEvent } from './types/public'
import type { MockUseStoreState, MockEventData } from './types/internal'

export const createEventFirer = (
  act: ReactReconciler.Reconciler<unknown, unknown, unknown, unknown, unknown>['act'],
  store: MockUseStoreState,
) => {
  const findEventHandler = (
    element: ReactThreeTestInstance,
    eventName: string,
  ): ((event: MockSyntheticEvent) => any) | null => {
    const eventHandlerName = toEventHandlerName(eventName)

    const props = element.props

    if (typeof props[eventHandlerName] === 'function') {
      return props[eventHandlerName]
    }

    if (typeof props[eventName] === 'function') {
      return props[eventName]
    }

    console.warn(
      `Handler for ${eventName} was not found. You must pass event names in camelCase or name of the handler https://github.com/pmndrs/react-three-fiber/blob/master/packages/test-renderer/markdown/rttr.md#create-fireevent`,
    )

    return null
  }

  const createSyntheticEvent = (element: ReactThreeTestInstance, data: MockEventData): MockSyntheticEvent => {
    const raycastEvent = {
      camera: store.getState().camera,
      stopPropagation: () => {},
      target: element,
      currentTarget: element,
      sourceEvent: data,
      ...data,
    }
    return raycastEvent
  }

  const invokeEvent = async (element: ReactThreeTestInstance, eventName: string, data: MockEventData): Promise<any> => {
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

  const fireEvent = async (
    element: ReactThreeTestInstance,
    eventName: string,
    data: MockEventData = {},
  ): Promise<any> => await invokeEvent(element, eventName, data)

  return fireEvent
}
