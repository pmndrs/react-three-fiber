//* useFrame Hook ==============================

import * as React from 'react'
import { useStore } from '../'
import { useMutableCallback, useIsomorphicLayoutEffect } from '../../utils'
import { notifyDepreciated } from '../../notices'
import { getScheduler, type Scheduler } from './scheduler'

//* Type Imports ==============================
import type { FrameNextCallback, UseFrameNextOptions, FrameNextControls } from '#types'

/**
 * Frame hook with phase-based ordering, priority, and FPS throttling.
 *
 * Returns a controls object for manual stepping, pausing, and resuming.
 *
 * @param callback - Function called each frame with (state, delta). Optional if you only need scheduler access.
 * @param priorityOrOptions - Either a priority number (backwards compat) or options object
 * @returns Controls object with step(), stepAll(), pause(), resume(), isPaused, id, scheduler
 *
 * @example
 * // Simple priority (backwards compat)
 * useFrame((state, delta) => { ... }, 5)
 *
 * @example
 * // With phase-based ordering
 * useFrame((state, delta) => { ... }, { phase: 'physics' })
 *
 * @example
 * // With controls
 * const controls = useFrame(cb, { phase: 'physics', id: 'my-physics' })
 * controls.step()      // Step this job only
 * controls.stepAll()   // Step all jobs
 * controls.pause()     // Pause this job
 * controls.resume()    // Resume this job
 *
 * @example
 * // Manual mode (frameloop='never')
 * const { stepAll } = useFrame(cb)
 * // In your animation controller:
 * stepAll()  // Advance all useFrame jobs
 *
 * @example
 * // Scheduler-only access (no callback)
 * const { scheduler } = useFrame()
 * scheduler.pauseJob('some-job-id')
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe
 */
export function useFrame(
  callback?: FrameNextCallback,
  priorityOrOptions?: number | UseFrameNextOptions,
): FrameNextControls {
  const store = useStore()

  // Get the root ID from store for registering jobs with correct root
  const getRootId = React.useCallback(() => {
    const state = store.getState()
    // The rootId should be stored in internal state
    return (state.internal as any).rootId as string | undefined
  }, [store])

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
  const reactId = React.useId()
  const id = options.id ?? reactId

  // Memoize callback ref (always points to latest callback)
  const callbackRef = useMutableCallback(callback)

  //* Legacy Priority Tracking --------------------------------
  // In the old system, useFrame(cb, priority) with priority > 0 meant "I'm taking over rendering"
  // This incremented internal.priority, causing the default renderer to skip
  // We maintain this behavior for backwards compatibility while warning about deprecation
  const isLegacyPriority = typeof priorityOrOptions === 'number' && priorityOrOptions > 0

  // Subscribe on mount, unsubscribe on unmount (only if callback provided)
  useIsomorphicLayoutEffect(() => {
    // Skip registration if no callback - user just wants scheduler access
    if (!callback) return

    const scheduler = getScheduler()
    const rootId = getRootId()
    const state = store.getState()

    // Legacy backwards compat: priority > 0 meant "I'm taking over rendering"
    // Increment internal.priority so the default renderer skips
    // IMPORTANT: For portals, we must also increment the ROOT's internal.priority,
    // not just the portal's, since the default renderer checks the root's state
    if (isLegacyPriority) {
      // Increment current store's priority
      state.internal.priority++

      // Also increment all parent roots' priority (for portal support)
      // This ensures the main Canvas's default renderer skips when a portal takes over
      let parentRoot = state.previousRoot
      while (parentRoot) {
        const parentState = parentRoot.getState()
        if (parentState?.internal) parentState.internal.priority++
        parentRoot = parentState?.previousRoot
      }

      notifyDepreciated({
        heading: 'useFrame with numeric priority is deprecated',
        body:
          'Using useFrame(callback, number) to control render order is deprecated.\n\n' +
          'For custom rendering, use: useFrame(callback, { phase: "render" })\n' +
          'For execution order within update phase, use: useFrame(callback, { priority: number })',
        link: 'https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe',
      })
    }

    // Wrapper that calls the memoized ref
    const wrappedCallback: FrameNextCallback = (frameState, delta) => {
      callbackRef.current?.(frameState, delta)
    }

    // Register with global scheduler
    const unregister = scheduler.register(wrappedCallback, {
      id,
      rootId,
      ...options,
    })

    // Cleanup: unregister and decrement legacy priority counter
    return () => {
      unregister()
      if (isLegacyPriority) {
        const currentState = store.getState()
        if (currentState.internal) {
          currentState.internal.priority--

          // Also decrement all parent roots' priority
          let parentRoot = currentState.previousRoot
          while (parentRoot) {
            const parentState = parentRoot.getState()
            if (parentState?.internal) parentState.internal.priority--
            parentRoot = parentState?.previousRoot
          }
        }
      }
    }
    // Note: `callback` intentionally excluded - useMutableCallback handles updates
    // Including it would cause re-registration every render, resetting pause state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, id, optionsKey, isLegacyPriority])

  // Reactive isPaused via useSyncExternalStore --------------------------------
  const isPaused = React.useSyncExternalStore(
    // Subscribe function
    React.useCallback(
      (onStoreChange: () => void) => {
        return getScheduler().subscribeJobState(id, onStoreChange)
      },
      [id],
    ),
    // getSnapshot function
    React.useCallback(() => getScheduler().isJobPaused(id), [id]),
    // getServerSnapshot function (SSR)
    React.useCallback(() => false, []),
  )

  // Build controls object (memoized to maintain stable reference)
  const controls = React.useMemo<FrameNextControls>(() => {
    const scheduler = getScheduler()

    return {
      /** The job's unique ID */
      id,

      /**
       * Access to the global scheduler for frame loop control.
       * Use for controlling the entire frame loop, adding phases, etc.
       */
      scheduler: scheduler as Scheduler,

      /**
       * Manually step this job only.
       * Bypasses FPS limiting - always runs.
       * @param timestamp Optional timestamp (defaults to performance.now())
       */
      step: (timestamp?: number) => {
        getScheduler().stepJob(id, timestamp)
      },

      /**
       * Manually step ALL jobs in the scheduler.
       * Useful for frameloop='never' mode.
       * @param timestamp Optional timestamp (defaults to performance.now())
       */
      stepAll: (timestamp?: number) => {
        getScheduler().step(timestamp)
      },

      /**
       * Pause this job (set enabled=false).
       * Job remains registered but won't run.
       */
      pause: () => {
        getScheduler().pauseJob(id)
      },

      /**
       * Resume this job (set enabled=true).
       */
      resume: () => {
        getScheduler().resumeJob(id)
      },

      /**
       * Reactive paused state - automatically updates when pause/resume is called.
       * No need for forceUpdate() in your components.
       */
      isPaused,
    }
  }, [id, isPaused])

  return controls
}

// Re-export scheduler
export { getScheduler, Scheduler } from './scheduler'
