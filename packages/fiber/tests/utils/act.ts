import { act as reactAct } from 'react'

/**
 * R3F-aware `act` — React's `act`, plus a wait for the frame loop to settle.
 *
 * R3F does not finish its work when React does. Renderer init, the scheduler's RAF jobs and
 * frame-timed event dispatch all land on *subsequent* animation frames, so a bare `reactAct()`
 * returns before the thing under test has happened.
 *
 * The fix is ordering, not addition: the frame wait goes *inside* the act scope, so the state
 * updates those frames trigger are flushed by act rather than escaping it. Several test files
 * previously defined a local helper that awaited two RAFs and called itself `act` without ever
 * calling React's — which read correctly at every call site while wrapping nothing. That is where
 * the "An update to Root inside a test was not wrapped in act(...)" warnings came from.
 */
export async function act<T>(fn: () => T | Promise<T>): Promise<T> {
  let value!: T

  await reactAct(async () => {
    value = await fn()
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
  })

  return value
}

/** Advance `count` settled frames. Each is its own act scope, so updates flush frame by frame. */
export async function advanceFrames(count: number = 3): Promise<void> {
  for (let i = 0; i < count; i++) {
    await act(async () => {})
  }
}
