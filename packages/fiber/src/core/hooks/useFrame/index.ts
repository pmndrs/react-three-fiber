//* useFrame Hook ==============================

import * as React from 'react'
import { context } from '../../store'
import { useMutableCallback, useIsomorphicLayoutEffect } from '../../utils'
import { notifyDepreciated } from '../../utils/notices'
import { getScheduler, type Scheduler } from './scheduler'

//* Type Imports ==============================
import type { FrameNextCallback, UseFrameNextOptions, FrameNextControls } from '#types'

/**
 * Frame hook with phase-based ordering, priority, and FPS throttling.
 *
 * Works both inside and outside Canvas context:
 * - Inside Canvas: Full RootState (gl, scene, camera, etc.)
 * - Outside Canvas (waiting mode): Waits for Canvas to mount, then gets full state
 * - Outside Canvas (independent mode): Fires immediately with timing-only state
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
 * // Outside Canvas - waits for Canvas to mount
 * function UI() {
 *   useFrame((state, delta) => { syncUI(state.camera) });
 *   return <button>...</button>;
 * }
 *
 * @example
 * // Independent mode - no Canvas needed
 * getScheduler().independent = true;
 * useFrame((state, delta) => { updateGame(delta) });
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
  // Use context directly - returns null outside Canvas (doesn't throw!)
  const store = React.useContext(context)
  const isInsideCanvas = store !== null

  const scheduler = getScheduler()

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
    return typeof priorityOrOptions === 'number' ? { priority: priorityOrOptions } : (priorityOrOptions ?? {})
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

    if (isInsideCanvas) {
      //* ===== INSIDE CANVAS: Full RootState behavior =====
      const state = store.getState()
      const rootId = (state.internal as any).rootId as string | undefined

      // Legacy backwards compat: priority > 0 meant "I'm taking over rendering"
      if (isLegacyPriority) {
        state.internal.priority++

        // Also increment all parent roots' priority (for portal support)
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

      // Wrapper that merges store state with timing (for portal isolation)
      const wrappedCallback: FrameNextCallback = (frameState, delta) => {
        const localState = store.getState()
        const mergedState = {
          ...localState,
          time: frameState.time,
          delta: frameState.delta,
          elapsed: frameState.elapsed,
          frame: frameState.frame,
        }
        callbackRef.current?.(mergedState as typeof frameState, delta)
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

            let parentRoot = currentState.previousRoot
            while (parentRoot) {
              const parentState = parentRoot.getState()
              if (parentState?.internal) parentState.internal.priority--
              parentRoot = parentState?.previousRoot
            }
          }
        }
      }
    } else {
      //* ===== OUTSIDE CANVAS: New behavior =====
      const registerOutside = () => {
        return scheduler.register((state, delta) => callbackRef.current?.(state, delta), { id, ...options })
      }

      // Independent mode or root already exists: register now
      if (scheduler.independent || scheduler.isReady) {
        return registerOutside()
      }

      // Wait for a Canvas to mount
      let unregisterJob: (() => void) | null = null
      const unsubReady = scheduler.onRootReady(() => {
        unregisterJob = registerOutside()
      })

      return () => {
        unsubReady()
        unregisterJob?.()
      }
    }
    // Note: `callback` intentionally excluded - useMutableCallback handles updates
  }, [store, scheduler, id, optionsKey, isLegacyPriority, isInsideCanvas])

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
