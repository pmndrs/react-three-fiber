import * as React from 'react'

const act: <T = any>(cb: () => Promise<T>) => Promise<T> = (React as any).unstable_act

export interface WaitOptions {
  interval?: number
  timeout?: number
}

export async function waitFor(
  callback: () => boolean | void,
  { interval = 50, timeout = 5000 }: WaitOptions = {},
): Promise<void> {
  await act(async () => {
    const start = performance.now()

    while (true) {
      const result = callback()
      if (result || result == null) break
      if (interval) await new Promise((resolve) => setTimeout(resolve, interval))
      if (timeout && performance.now() - start >= timeout) throw new Error(`Timed out after ${timeout}ms.`)
    }
  })
}
