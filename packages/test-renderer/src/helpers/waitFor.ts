import * as React from 'react'

const resolveAfter = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
const act: <T = any>(cb: () => Promise<T>) => Promise<T> = (React as any).unstable_act

export interface WaitOptions {
  interval?: number
  timeout?: number
}

export async function waitFor(
  callback: () => boolean | void,
  { interval = 50, timeout = 5000 }: WaitOptions = {},
): Promise<void> {
  const waitForResult = async () => {
    while (true) {
      const result = callback()
      if (result || result == null) break
      if (interval) await resolveAfter(interval)
    }
  }

  await act(() =>
    Promise.race(
      [
        waitForResult(),
        timeout &&
          resolveAfter(timeout).then(() => {
            throw new Error(`Timed out after ${timeout}ms.`)
          }),
      ].filter(Boolean),
    ),
  )
}
