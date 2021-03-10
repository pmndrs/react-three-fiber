// helpers

import type { Reconciler } from 'react-reconciler'

class TimeoutError extends Error {
  constructor(util: Function, timeout: number) {
    super(`Timed out in ${util.name} after ${timeout}ms.`)
  }
}

const resolveAfter = (ms: number): Promise<void> => {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

const callAfter = async (callback: () => void, ms: number): Promise<void> => {
  await resolveAfter(ms)
  callback()
}

const DEFAULT_INTERVAL = 50
const DEFAULT_TIMEOUT = 10000

// types

type WaitOptions = {
  interval?: number | false
  timeout?: number | false
}

type AsyncUtils = {
  waitFor: (callback: () => boolean | void, options?: WaitOptions) => Promise<void>
}

// the utils

export const asyncUtils = (
  act: Reconciler<unknown, unknown, unknown, unknown, unknown>['act'],
  addResolver: (callback: () => void) => void,
): AsyncUtils => {
  const wait = async (callback: () => boolean | void, { interval, timeout }: WaitOptions) => {
    const checkResult = () => {
      const callbackResult = callback()
      return callbackResult ?? callbackResult === undefined
    }

    const waitForResult = async () => {
      while (true) {
        await Promise.race(
          [new Promise<void>((resolve) => addResolver(resolve)), interval && resolveAfter(interval)].filter(Boolean),
        )

        if (checkResult()) {
          return
        }
      }
    }

    let timedOut = false

    if (!checkResult()) {
      if (timeout) {
        const timeoutPromise = () =>
          callAfter(() => {
            timedOut = true
          }, timeout)

        await act(() => Promise.race([waitForResult(), timeoutPromise()]))
      } else {
        await act(waitForResult)
      }
    }

    return !timedOut
  }

  const waitFor = async (
    callback: () => boolean | void,
    { interval = DEFAULT_INTERVAL, timeout = DEFAULT_TIMEOUT }: WaitOptions = {},
  ) => {
    const safeCallback = () => {
      try {
        return callback()
      } catch (error: unknown) {
        return false
      }
    }

    const result = await wait(safeCallback, { interval, timeout })
    if (!result && timeout) {
      throw new TimeoutError(waitFor, timeout)
    }
  }

  return {
    waitFor,
  }
}
