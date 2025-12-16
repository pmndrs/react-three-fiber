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

  // Normalize options - if number, treat as { priority: number }
  const options: UseFrameNextOptions = React.useMemo(() => {
    if (typeof priorityOrOptions === 'number') {
      return { priority: priorityOrOptions }
    }
    return priorityOrOptions ?? {}
  }, [priorityOrOptions])

  // Generate stable ID if not provided
  const generatedId = React.useId()
  const id = options.id ?? generatedId

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
    const unsubscribe = scheduler.register(wrappedCallback, {
      id,
      phase: options.phase,
      before: options.before,
      after: options.after,
      priority: options.priority,
      fps: options.fps,
      drop: options.drop,
      enabled: options.enabled,
    })

    return unsubscribe
  }, [
    store,
    id,
    options.phase,
    options.before,
    options.after,
    options.priority,
    options.fps,
    options.drop,
    options.enabled,
    callbackRef,
  ])

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
