import * as React from 'react'
import { ConcurrentRoot } from '../../react-reconciler/constants.js'
import { createRootConfiguration } from './configuration'
import { initializeRenderer } from './renderer'
import { advance, invalidate, configureScheduler } from './loop'
import { deferred, fulfilled, isPromiseLike, rejected } from './utils/promise'
import { reconciler } from './reconciler'
import { context, createStore } from './store'
import { dispose, useIsomorphicLayoutEffect } from './utils'
import { attachRootExtensions, detachRootExtensions } from './extensions'
import { cleanupHelperGroup } from './visibility'
import type { Root, RootState, RootStore, RenderProps, ReconcilerRoot, RendererProvider, TrackedPromise } from '#types'
const noop = () => {}

export const _roots = new Map<HTMLCanvasElement | OffscreenCanvas, Root>()

type RootEvent = { type: 'use' } | { type: 'unmount'; token: symbol } | { type: 'dispose'; token: symbol }

/**
 * open -> closing -> disposed
 *          | use
 *          v
 *         open
 *
 * Only closing can be cancelled. Each unmount carries a token, so only the latest one can dispose.
 */
function transitionRoot(root: Root, event: RootEvent): boolean {
  const state = root.state
  switch (event.type) {
    case 'use':
      if (state.status === 'disposed') return false
      if (state.status === 'closing') root.store.getState().internal.active = true
      root.state = { status: 'open' }
      return true
    case 'unmount':
      if (state.status === 'disposed') return false
      root.state = { status: 'closing', token: event.token }
      return true
    case 'dispose':
      if (state.status !== 'closing' || state.token !== event.token) return false
      root.state = { status: 'disposed' }
      return true
  }
}

export function createRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
  provider: RendererProvider,
): ReconcilerRoot<TCanvas> {
  // Check against mistaken use of createRoot
  const prevRoot = _roots.get(canvas)
  const prevFiber = prevRoot?.fiber
  const prevStore = prevRoot?.store

  if (prevRoot) console.warn('R3F.createRoot should only be called once!')

  // Report when an error was detected in a previous render
  // https://github.com/pmndrs/react-three-fiber/pull/2261
  const logRecoverableError =
    typeof reportError === 'function'
      ? // In modern browsers, reportError will dispatch an error event,
        // emulating an uncaught JavaScript error.
        reportError
      : // In older browsers and test environments, fallback to console.error.
        console.error

  // Create store
  const store = prevStore || createStore(invalidate, advance)
  // Create renderer
  const fiber =
    prevFiber ||
    (reconciler as any).createContainer(
      store, // container
      ConcurrentRoot, // tag
      null, // hydration callbacks
      false, // isStrictMode
      null, // concurrentUpdatesByDefaultOverride
      '', // identifierPrefix
      logRecoverableError, // onUncaughtError
      logRecoverableError, // onCaughtError
      logRecoverableError, // onRecoverableError
      null, // transitionCallbacks
    )
  // Map it
  const root: Root = prevRoot || {
    fiber,
    store,
    state: { status: 'open' },
    ready: fulfilled(undefined),
    configuration: {} as Root['configuration'],
  }
  if (!prevRoot) _roots.set(canvas, root)

  if (!prevRoot) root.configuration.apply = createRootConfiguration(store, canvas)
  let mounted = false

  return {
    get ready() {
      return root.ready
    },
    configure(props: RenderProps<TCanvas> = {}): TrackedPromise<ReconcilerRoot<TCanvas>> {
      if (!transitionRoot(root, { type: 'use' })) {
        return rejected(new Error('R3F: Cannot configure a root after it has unmounted (disposal has started).'))
      }

      // Configuration applies in call order. Publishing first queues calls made while this one runs
      const previous = root.ready
      const { promise, resolve, reject } = deferred<ReconcilerRoot<TCanvas>>()
      root.ready = promise

      const run = () => {
        try {
          const initialized = initializeRenderer(canvas, provider, store, props)
          const apply = () => {
            const previous = root.configuration.previous
            root.configuration.apply(props)
            configureScheduler(store, props.id, props.scheduler, previous?.scheduler)
            // Extensions see a configured renderer and scheduler before children or onCreated run.
            attachRootExtensions(store)
            root.configuration.previous = props
            resolve(this)
          }
          if (isPromiseLike(initialized)) Promise.resolve(initialized).then(apply).catch(reject)
          else apply()
        } catch (error) {
          reject(error)
        }
      }

      if (previous.status === 'pending') previous.then(run, reject)
      else run()
      return promise
    },
    render(children: React.ReactNode): RootStore {
      if (!transitionRoot(root, { type: 'use' })) return store

      // The root has to be configured before it can be rendered
      if (!store.getState().internal.actualRenderer && root.ready.status === 'fulfilled') this.configure()
      if (root.ready.status === 'rejected') throw root.ready.reason

      const commit = () => {
        if (root.state.status !== 'open' || root.ready.status === 'rejected') return
        // Wait for all queued configuration, including any queued while waiting
        if (root.ready.status === 'pending') {
          root.ready.then(commit, logRecoverableError)
          return
        }
        const onCreated = root.configuration.previous?.onCreated
        const element = <Provider store={store} children={children} onCreated={onCreated} rootElement={canvas} />
        if (mounted) {
          reconciler.updateContainer(element, fiber, null, noop)
          return
        }
        // Mount within the caller's commit, so the scene exists once render returns
        mounted = true
        // @ts-ignore - reconciler types are not maintained
        reconciler.updateContainerSync(element, fiber, null, noop)
        // @ts-ignore - reconciler types are not maintained
        reconciler.flushSyncWork()
      }

      commit()
      return store
    },
    unmount(): void {
      if (_roots.get(canvas) === root) unmountComponentAtNode(canvas)
    },
  }
}

interface ProviderProps<TCanvas extends HTMLCanvasElement | OffscreenCanvas> {
  onCreated?: (state: RootState) => void
  store: RootStore
  children: React.ReactNode
  rootElement: TCanvas
}

function Provider<TCanvas extends HTMLCanvasElement | OffscreenCanvas>({
  store,
  children,
  onCreated,
  rootElement,
}: ProviderProps<TCanvas>): React.JSX.Element {
  useIsomorphicLayoutEffect(() => {
    const state = store.getState()
    // Flag the canvas active, rendering will now begin
    state.set((state) => ({ internal: { ...state.internal, active: true } }))
    // Notify that init is completed, the scene graph exists, but nothing has yet rendered
    if (onCreated) onCreated(state)
    // Connect events to the targets parent, this is done to ensure events are registered on
    // a shared target, and not on the canvas itself
    if (!store.getState().events.connected) state.events.connect?.(rootElement)
  }, [])
  return <context.Provider value={store}>{children}</context.Provider>
}

/**
 * Unmount the root on `canvas`. The teardown runs once React has committed the unmount, and waits
 * for a renderer that is still being created. `callback` runs when the root is gone: after the
 * teardown, and when it disposed a renderer R3F created whose `dispose()` is async (WebGPURenderer
 * from three r186), after that dispose has settled.
 */
export function unmountComponentAtNode<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
  callback?: (canvas: TCanvas) => void,
): void {
  const claim = Symbol('unmount')
  const root = _roots.get(canvas)
  if (!root || !transitionRoot(root, { type: 'unmount', token: claim })) return

  // Cleared by configure and render, which cancels the teardown. React may clean a root up and
  // set it up again (StrictMode, a fast remount), so unmounting is a request until React has
  // committed it; guessing with a timer tore down roots that had already been remounted.
  // Stop drawing and invalidating while the tree unmounts. A remount before teardown mounts the
  // Provider again, which sets `active` back
  root.store.getState().internal.active = false

  reconciler.updateContainer(null, root.fiber, null, () => {
    if (root.state.status !== 'closing' || root.state.token !== claim) return

    // Effect cleanups flush before the next update
    reconciler.updateContainer(null, root.fiber, null, () => {
      if (root.state.status !== 'closing' || root.state.token !== claim) return

      // A renderer still being created has to exist, and be leased, before it can be released
      if (root.ready.status === 'pending') root.ready.then(teardown, teardown)
      else teardown()
    })
  })

  function teardown() {
    if (root!.ready.status === 'pending') {
      root!.ready.then(teardown, teardown)
      return
    }
    if (!transitionRoot(root!, { type: 'dispose', token: claim })) return
    // Nothing can render or configure this root from here on
    _roots.delete(canvas)

    // Read the store now, not at unmount: configure may have published a renderer since
    const state = root!.store.getState()
    const internal = state.internal
    internal.active = false

    // Teardown is best-effort, but one failing step must not skip the rest, least of all the
    // renderer release at the end. Failures are reported rather than swallowed.
    const attempt = <T,>(step: () => T): T | undefined => {
      try {
        return step()
      } catch (error) {
        console.warn('[R3F] Error while unmounting root; teardown may be incomplete:', error)
      }
    }

    // A dead Canvas must not follow display changes. Done here rather than when unmount() is
    // called, so an unmount cancelled by a remount keeps its watcher. A configure that was still
    // awaiting its renderer at unmount has started watching by now: teardown waits for `ready`.
    attempt(() => internal.unwatchDpr?.())
    internal.unwatchDpr = undefined

    // Stop everything that draws with the renderer before releasing it
    attempt(() => internal.unregisterRoot?.())
    internal.unregisterRoot = undefined
    // Children have unmounted (their hook cleanups ran); let extensions release per-root state
    attempt(() => detachRootExtensions(root!.store))
    // Unregister primary canvas from registry (if it was registered)
    attempt(() => internal.unregisterPrimary?.())
    attempt(() => internal.untrackStandalone?.())

    attempt(() => state.events.disconnect?.())
    // Secondary canvases share the primary's renderer and its XR session
    // A root whose configure() stopped before setting up XR has no XR manager
    if (!internal.isSecondary && internal.actualRenderer?.xr && state.xr) attempt(() => state.xr.disconnect())
    // Clean up occlusion system and helper group
    attempt(() => cleanupHelperGroup(root!.store))
    // A root that never finished configuring has no scene
    if (state.scene) attempt(() => dispose(state.scene))

    // Dispose the CanvasTarget we created. A primary's target is the renderer's own
    // default target, which the renderer owns and which may outlive this root (an
    // external renderer reused across mounts), so only secondaries dispose theirs.
    const canvasTarget = internal.canvasTarget
    if (internal.isSecondary && canvasTarget?.dispose) attempt(() => canvasTarget.dispose())

    // Last: releasing the final lease disposes a renderer R3F created. A caller's renderer, or one
    // a secondary still draws with, is left alone
    const released = attempt(() => internal.releaseRenderer?.())
    internal.releaseRenderer = undefined

    // The callback means the root is gone, so an async dispose() has to settle first
    if (callback) {
      if (released) {
        released.then(() => callback(canvas)).catch((error) => console.warn('[R3F] Error in unmount callback', error))
      } else {
        callback(canvas)
      }
    }
  }
}
