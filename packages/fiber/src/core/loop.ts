/** Frame scheduling, root jobs, and imperative loop controls. */
import type { WebGPURenderer } from 'three/webgpu'
import { getScheduler } from '@pmndrs/scheduler'
import { notifyDepreciated } from './utils/notices'
import { is, updateFrustum } from './utils'
import { checkVisibility } from './visibility'
import type { RootStore, RenderProps, RootState, GlobalRenderCallback } from '#types'

type SchedulerConfiguration = RenderProps<HTMLCanvasElement>['scheduler']
const shallowLoose = { objects: 'shallow', strict: false } as const

/** Installs root-owned jobs once, and applies changed ordering constraints thereafter. */
export function configureScheduler(
  store: RootStore,
  canvasId: string | undefined,
  schedulerConfig: SchedulerConfiguration,
  previous: SchedulerConfiguration,
): void {
  const state = store.getState()
  //* Scheduler Integration ==============================
  // Register this root with the global scheduler
  const scheduler = getScheduler()
  const rootId = (state.internal as any).rootId as string | undefined

  const ordersItself = schedulerConfig?.before !== undefined || schedulerConfig?.after !== undefined
  const rootBefore = schedulerConfig?.before
  const rootAfter = ordersItself ? schedulerConfig?.after : state.internal.sharedAfter

  if (!rootId) {
    // Generate a unique root ID and register with global scheduler
    const newRootId = state.internal.pendingRootId ?? canvasId ?? scheduler.generateRootId()
    const unregisterRoot = scheduler.registerRoot(newRootId, {
      getState: () => store.getState(),
      onError: (err) => store.getState().setError(err),
      frameloop: store.getState().frameloop,
      before: rootBefore,
      after: rootAfter,
      order: schedulerConfig?.order,
    })

    // Register canvas target job - makes this root's canvas target the renderer's active one
    // Runs in 'start' phase so it's set before any other jobs (including user render jobs)
    const unregisterCanvasTarget = scheduler.register(
      () => {
        const state = store.getState()
        const canvasTarget = state.internal.canvasTarget
        if (canvasTarget) {
          const renderer = state.internal.actualRenderer as WebGPURenderer
          // A lone primary owns the renderer's default target, which is already active; only
          // swap when some other canvas (a secondary, or the primary after one) left it
          // pointed elsewhere. setCanvasTarget also moves the resize listener, so skipping
          // the no-op swap keeps that listener untouched on the common single-canvas path.
          if (renderer.getCanvasTarget() !== canvasTarget) renderer.setCanvasTarget(canvasTarget)

          // Flush a pending resize for THIS root, now that its target is the active one.
          //
          // The backend caches a render pass descriptor per canvas whose depth-stencil view
          // is built once, while the colour attachment comes fresh from the swap chain each
          // frame. They only stay in step because Renderer._onCanvasTargetResize calls
          // backend.updateSize() -- but that listener lives on a single target at a time and
          // setCanvasTarget moves it on every swap, so a canvas that resizes while it is not
          // active never hears its own resize and renders a stale depth view forever
          // (per-frame GPUValidationError about mismatched attachment sizes).
          //
          // This is the correct place to flush precisely because updateSize() acts on
          // getCanvasTarget(): immediately after setCanvasTarget, that is us. See #3847.
          if (state.internal.canvasTargetSizeDirty) {
            state.internal.canvasTargetSizeDirty = false
            // Backend.updateSize() exists at runtime on three's base Backend (and
            // WebGPUBackend), but is absent from the shipped type declarations. Optional-call
            // so a backend without it is simply a no-op rather than a crash.
            ;(renderer.backend as Partial<{ updateSize(): void }> | undefined)?.updateSize?.()
          }
        }
      },
      {
        id: `${newRootId}_canvasTarget`,
        rootId: newRootId,
        phase: 'start',
        system: true,
      },
    )

    // Register events flush job - flushes deferred pointer raycasts at frame start
    // Runs in 'input' phase (before physics/update) so hover state is up-to-date
    const unregisterEventsFlush = scheduler.register(
      () => {
        const state = store.getState()
        state.events.flush?.()
      },
      {
        id: `${newRootId}_events`,
        rootId: newRootId,
        phase: 'input',
        system: true,
      },
    )

    // Register frustum update job - updates frustum from camera before render
    // Uses { before: 'render' } so it runs after 'update' (capturing this frame's
    // camera movement) but before 'render', keeping state.frustum fresh for the
    // render phase. This resolves to an auto-generated 'before:render' phase.
    const unregisterFrustum = scheduler.register(
      () => {
        const state = store.getState()
        if (state.autoUpdateFrustum && state.camera) {
          updateFrustum(state.camera, state.frustum)
        }
      },
      {
        id: `${newRootId}_frustum`,
        rootId: newRootId,
        before: 'render',
        system: true,
      },
    )

    // Register visibility check job - checks onFramed, onOccluded, onVisible events
    // Runs before 'render' (same 'before:render' phase as the frustum job) and after
    // the frustum job. Frustum/onFramed checks are pure CPU math off the camera, so
    // running before render keeps them current. Occlusion (onOccluded / the occlusion
    // half of onVisible) reads internal.occlusionCache, which the render pass populates;
    // that data is inherently one frame deferred regardless of this job's ordering.
    const unregisterVisibility = scheduler.register(
      () => {
        const state = store.getState()
        checkVisibility(state)
      },
      {
        id: `${newRootId}_visibility`,
        rootId: newRootId,
        before: 'render',
        system: true,
        after: `${newRootId}_frustum`,
      },
    )

    // Register default render job - this handles the actual THREE.js rendering
    // Marked as 'system' so it doesn't count as a user taking over the render phase
    // Only renders if no user has registered in the 'render' phase (taking over rendering)
    const unregisterRender = scheduler.register(
      () => {
        const state = store.getState()
        const renderer = state.internal.actualRenderer as WebGPURenderer

        // Skip if a user has taken over rendering by registering in the 'render' phase
        // Also check legacy priority system for backwards compatibility
        // Note: canvas target is already set by the 'start' phase job
        const userHandlesRender = scheduler.hasUserJobsInPhase('render', newRootId)
        if (userHandlesRender || state.internal.priority) return

        // A render override (setRenderOverride, e.g. useRenderPipeline) replaces the plain
        // renderer.render() call; fps throttling, takeover and error handling stay here.
        // Wrapped in try-catch to handle HMR scenarios where scene objects may be disposed
        try {
          const renderOverride = state.internal.renderOverride
          if (renderOverride) renderOverride()
          else if (renderer?.render) renderer.render(state.scene, state.camera)
        } catch (error) {
          // Propagate render errors to error boundary
          state.setError(error instanceof Error ? error : new Error(String(error)))
        }
      },
      {
        // Use canvas ID directly as job ID if available, otherwise use generated rootId
        id: canvasId || `${newRootId}_render`,
        rootId: newRootId,
        phase: 'render',
        system: true, // Internal flag: this is a system job, not user-controlled
        // FPS throttles only the default render job; Canvas ordering belongs to the root.
        ...(schedulerConfig?.fps && { fps: schedulerConfig.fps }),
      },
    )

    // Store the rootId and unregister function in internal state
    state.set((state) => ({
      internal: {
        ...state.internal,
        rootId: newRootId,
        pendingRootId: undefined,
        unregisterRoot: () => {
          unregisterRoot()
          unregisterCanvasTarget()
          unregisterEventsFlush()
          unregisterFrustum()
          unregisterVisibility()
          unregisterRender()
        },
        scheduler,
      } as any,
    }))
  } else {
    // Canvas ordering is root-scoped so every job owned by this Canvas moves together.
    const constraintsChanged =
      !is.equ(schedulerConfig?.before, previous?.before, shallowLoose) ||
      !is.equ(schedulerConfig?.after, previous?.after, shallowLoose)

    if (constraintsChanged) {
      scheduler.setRootConstraints(rootId, {
        before: rootBefore,
        after: rootAfter,
      })
    }

    if (schedulerConfig?.order !== previous?.order) {
      scheduler.setRootOrder(rootId, schedulerConfig?.order ?? 0)
    }
  }
}

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
 * With a state argument, only that root's jobs run on the requested frames; other
 * roots on 'demand' stay idle. Without one, every registered root is invalidated.
 *
 * @param state - Optional root state; targets the invalidation at that root
 * @param frames - Number of frames to request (default: 1)
 * @param stackFrames - If false, sets pendingFrames to frames. If true, adds to existing pendingFrames (default: false)
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#invalidate
 */
export function invalidate(state?: RootState, frames = 1, stackFrames = false): void {
  const rootId = (state?.internal as any)?.rootId as string | undefined
  const scheduler = getScheduler()
  if (rootId) scheduler.invalidateRoot(rootId, frames, stackFrames)
  else scheduler.invalidate(frames, stackFrames)
}

/**
 * Advances the frameloop and runs render effects.
 * Useful for when manually rendering via `frameloop="never"`.
 *
 * With a state argument, only that root is stepped. Without one, every
 * registered root is stepped for backwards compatibility.
 *
 * @param timestamp - The timestamp to use for this frame
 * @param runGlobalEffects - Ignored (kept for backwards compat, global effects always run)
 * @param state - Optional root state; targets the manual step at that root
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#advance
 */
export function advance(timestamp: number, runGlobalEffects?: boolean, state?: RootState): void {
  const rootId = (state?.internal as any)?.rootId as string | undefined
  const scheduler = getScheduler()
  if (rootId) scheduler.stepRoot(rootId, timestamp)
  else scheduler.step(timestamp)
}
