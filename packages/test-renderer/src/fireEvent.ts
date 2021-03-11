import ReactReconciler from 'react-reconciler'

import { toEventHandlerName } from './helpers/strings'

import type { MockSceneChild, MockUseStoreState } from './createMockStore'

export const createEventFirer = (
  act: ReactReconciler.Reconciler<unknown, unknown, unknown, unknown, unknown>['act'],
  store: MockUseStoreState | undefined,
) => {
  const findEventHandler = (element: MockSceneChild, eventName: string): (() => void) | null => {
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

  const invokeEvent = async (element: MockSceneChild, eventName: string): Promise<any> => {
    const handler = findEventHandler(element, eventName)

    if (!handler) {
      return
    }

    let returnValue: any

    await act(async () => {
      returnValue = handler()
    })

    return returnValue
  }

  const fireEvent = async (element: MockSceneChild, eventName: string): Promise<any> =>
    await invokeEvent(element, eventName)

  return fireEvent
}
