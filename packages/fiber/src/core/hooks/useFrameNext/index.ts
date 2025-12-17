//* useFrameNext Hook ==============================

import * as React from 'react'
import { useStore } from '../'
import { useMutableCallback, useIsomorphicLayoutEffect } from '../../utils'

//* Type Imports ==============================
import type { FrameNextCallback, UseFrameNextOptions, FrameNextControls } from '#types'

/**
 * Next-generation frame hook with phase-based ordering, priority, and FPS throttling.
 *
 * Returns a controls object for manual stepping, pausing, and resuming.
 *
 * @param callback - Function called each frame with (state, delta)
 * @param priorityOrOptions - Either a priority number (backwards compat) or options object
 * @returns Controls object with step(), stepAll(), pause(), resume(), isPaused, id
 *
 * @example
 * // Simple priority (backwards compat with useFrame)
 * useFrameNext((state, delta) => { ... }, 5)
 *
 * @example
 * // With controls
 * const controls = useFrameNext(cb, { phase: 'physics', id: 'my-physics' })
 * controls.step()      // Step this job only
 * controls.stepAll()   // Step all jobs
 * controls.pause()     // Pause this job
 * controls.resume()    // Resume this job
 *
 * @example
 * // Manual mode (frameloop='never')
 * const { stepAll } = useFrameNext(cb)
 * // In your animation controller:
 * stepAll()  // Advance all useFrameNext jobs
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#useframenext
 */
export function useFrameNext(
  callback: FrameNextCallback,
  priorityOrOptions?: number | UseFrameNextOptions,
): FrameNextControls {
  const store = useStore()

  // Compute stable key from option VALUES (not reference)
  // This runs every render but is cheap - avoids inline object reference issues
  const optionsKey =
    typeof priorityOrOptions === 'number'
      ? `p:${priorityOrOptions}`
      : priorityOrOptions
      ? JSON.stringify({
          id: priorityOrOptions.id,
          phase: priorityOrOptions.phase,
          priority: priorityOrOptions.priority,
          fps: priorityOrOptions.fps,
          drop: priorityOrOptions.drop,
          enabled: priorityOrOptions.enabled,
          before: priorityOrOptions.before,
          after: priorityOrOptions.after,
        })
      : ''

  // Memoize options object using the stable key
  const options: UseFrameNextOptions = React.useMemo(() => {
    return typeof priorityOrOptions === 'number' ? { priority: priorityOrOptions } : priorityOrOptions ?? {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey])

  // Generate stable ID if not provided
  const id = options.id ?? React.useId()

  // Memoize callback ref (always points to latest callback)
  const callbackRef = useMutableCallback(callback)

  // Subscribe on mount, unsubscribe on unmount
  useIsomorphicLayoutEffect(() => {
    const state = store.getState()
    const scheduler = state.internal.scheduler

    if (!scheduler) {
      console.warn('[useFrameNext] Scheduler not initialized. Is this inside a Canvas?')
      return
    }

    // Wrapper that calls the memoized ref
    const wrappedCallback: FrameNextCallback = (frameState, delta) => {
      callbackRef.current?.(frameState, delta)
    }

    // Register with scheduler
    return scheduler.register(wrappedCallback, {
      id,
      ...options,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, id, optionsKey])

  // Build controls object (memoized to maintain stable reference)
  const controls = React.useMemo<FrameNextControls>(() => {
    const getScheduler = () => store.getState().internal.scheduler

    return {
      /** The job's unique ID */
      id,

      /**
       * Manually step this job only.
       * Bypasses FPS limiting - always runs.
       * @param timestamp Optional timestamp (defaults to performance.now())
       */
      step: (timestamp?: number) => {
        getScheduler()?.stepJob(id, timestamp)
      },

      /**
       * Manually step ALL jobs in the scheduler.
       * Useful for frameloop='never' mode.
       * @param timestamp Optional timestamp (defaults to performance.now())
       */
      stepAll: (timestamp?: number) => {
        getScheduler()?.step(timestamp)
      },

      /**
       * Pause this job (set enabled=false).
       * Job remains registered but won't run.
       */
      pause: () => {
        getScheduler()?.pauseJob(id)
      },

      /**
       * Resume this job (set enabled=true).
       */
      resume: () => {
        getScheduler()?.resumeJob(id)
      },

      /**
       * Check if this job is currently paused.
       */
      get isPaused(): boolean {
        return getScheduler()?.isJobPaused(id) ?? true
      },
    }
  }, [store, id])

  return controls
}

// Re-export types for convenience
export type {
  UseFrameNextOptions,
  FrameNextCallback,
  FrameNextState,
  AddPhaseOptions,
  SchedulerApi,
  FrameNextControls,
} from '#types'
