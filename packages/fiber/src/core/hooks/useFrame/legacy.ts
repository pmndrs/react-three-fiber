//* Legacy Frame Loop Functions ==============================
//
// This file contains:
// 1. Deprecated global effect functions (use useFrame with phases instead)
// 2. Frame loop control functions (invalidate, advance) that bridge to the scheduler
//
// Migration guide:
//   - addEffect → useFrame(cb, { phase: 'start' })
//   - addAfterEffect → useFrame(cb, { phase: 'finish' })
//   - addTail → scheduler.onIdle(cb)

import { getScheduler } from './scheduler'
import { notifyDepreciated } from '../../notices'

//* Type Imports ==============================
import type { GlobalRenderCallback, RootState } from '#types'

let effectId = 0

/**
 * Adds a global render callback which is called each frame BEFORE rendering.
 *
 * @deprecated Use `useFrame(callback, { phase: 'start' })` instead.
 * This function will be removed in a future version.
 *
 * @param callback - Function called each frame with timestamp
 * @returns Unsubscribe function
 *
 * @example
 * // OLD (deprecated)
 * const unsub = addEffect((timestamp) => { ... })
 *
 * // NEW
 * useFrame((state, delta) => { ... }, { phase: 'start' })
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addEffect
 */
export function addEffect(callback: GlobalRenderCallback): () => void {
  notifyDepreciated({
    heading: 'addEffect is deprecated',
    body: 'Use useFrame(callback, { phase: "start" }) instead.\naddEffect will be removed in a future version.',
    link: 'https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe',
  })

  const id = `legacy_effect_${effectId++}`
  return getScheduler().registerGlobal('before', id, callback)
}

/**
 * Adds a global after-render callback which is called each frame AFTER rendering.
 *
 * @deprecated Use `useFrame(callback, { phase: 'finish' })` instead.
 * This function will be removed in a future version.
 *
 * @param callback - Function called each frame with timestamp
 * @returns Unsubscribe function
 *
 * @example
 * // OLD (deprecated)
 * const unsub = addAfterEffect((timestamp) => { ... })
 *
 * // NEW
 * useFrame((state, delta) => { ... }, { phase: 'finish' })
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addAfterEffect
 */
export function addAfterEffect(callback: GlobalRenderCallback): () => void {
  notifyDepreciated({
    heading: 'addAfterEffect is deprecated',
    body: 'Use useFrame(callback, { phase: "finish" }) instead.\naddAfterEffect will be removed in a future version.',
    link: 'https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe',
  })

  const id = `legacy_afterEffect_${effectId++}`
  return getScheduler().registerGlobal('after', id, callback)
}

/**
 * Adds a global callback which is called when rendering stops.
 *
 * @deprecated Use `scheduler.onIdle(callback)` instead.
 * This function will be removed in a future version.
 *
 * @param callback - Function called when rendering stops
 * @returns Unsubscribe function
 *
 * @example
 * // OLD (deprecated)
 * const unsub = addTail((timestamp) => { ... })
 *
 * // NEW
 * const { scheduler } = useFrame()
 * const unsub = scheduler.onIdle((timestamp) => { ... })
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addTail
 */
export function addTail(callback: GlobalRenderCallback): () => void {
  notifyDepreciated({
    heading: 'addTail is deprecated',
    body: 'Use scheduler.onIdle(callback) instead.\naddTail will be removed in a future version.',
    link: 'https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe',
  })

  return getScheduler().onIdle(callback)
}

//* Frame Loop Control Functions ==============================
// These are non-deprecated utility functions for frame loop control

/**
 * Invalidates the view, requesting a frame to be rendered.
 * In demand mode, this triggers the scheduler to run frames.
 *
 * @param state - Optional root state (ignored in new scheduler, kept for backwards compat)
 * @param frames - Number of frames to request (default: 1)
 * @param stackFrames - If false, sets pendingFrames to frames. If true, adds to existing pendingFrames (default: false)
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#invalidate
 */
export function invalidate(state?: RootState, frames = 1, stackFrames = false): void {
  getScheduler().invalidate(frames, stackFrames)
}

/**
 * Advances the frameloop and runs render effects.
 * Useful for when manually rendering via `frameloop="never"`.
 *
 * @param timestamp - The timestamp to use for this frame
 * @param runGlobalEffects - Ignored (kept for backwards compat, global effects always run)
 * @param state - Ignored (kept for backwards compat)
 * @param frame - Ignored (kept for backwards compat)
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#advance
 */
export function advance(timestamp: number): void {
  getScheduler().step(timestamp)
}
