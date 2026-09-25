import * as React from 'react'
import * as THREE from 'three'
import type Reconciler from '../../react-reconciler/index.js'
import { ConcurrentRoot } from '../../react-reconciler/constants.js'
import { type AppliedConfiguration, type RenderProps, applyRootConfiguration, createRenderer } from './configuration'
import { advance, invalidate } from './loop'
import { deferred, fulfilled, isPromiseLike, rejected, type TrackedPromise } from './promise'
import { reconciler } from './reconciler'
import { context, createStore, isRenderer, type Renderer, type RootState, type RootStore } from './store'
import { calculateDpr, dispose, noop, useIsomorphicLayoutEffect, watchDpr } from './utils'

// Shim for OffscreenCanvas since it was removed from DOM types
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/54988
interface OffscreenCanvas extends EventTarget {}

export interface Root {
  fiber: Reconciler.FiberRoot
  store: RootStore
  state: RootStateMachine
  /** Settles once all accepted configuration has been applied */
  ready: TrackedPromise<unknown>
  configuration: AppliedConfiguration
  /** Whether R3F built `gl` (from defaults, props or a factory) and so disposes it on unmount */
  ownsRenderer: boolean
  /** Stops following devicePixelRatio changes */
  unwatchDpr?: () => void
}

export const _roots = new Map<HTMLCanvasElement | OffscreenCanvas, Root>()

export type RootStateMachine = { status: 'open' } | { status: 'closing'; token: symbol } | { status: 'disposed' }

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

export interface ReconcilerRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas> {
  ready: TrackedPromise<unknown>
  configure: (config?: RenderProps<TCanvas>) => TrackedPromise<ReconcilerRoot<TCanvas>>
  render: (element: React.ReactNode) => RootStore
  unmount: () => void
}

export function createRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
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
    configuration: {},
    ownsRenderer: false,
  }
  if (!prevRoot) _roots.set(canvas, root)

  let mounted = false

  return {
    get ready() {
      return root.ready
    },
    configure(props: RenderProps<TCanvas> = {}): TrackedPromise<ReconcilerRoot<TCanvas>> {
      if (!transitionRoot(root, { type: 'use' })) {
        return rejected(new Error('R3F: Cannot configure a root after disposal has started.'))
      }

      // Configuration applies in call order. Publishing first queues calls made while this one runs
      const previous = root.ready
      const { promise, resolve, reject } = deferred<ReconcilerRoot<TCanvas>>()
      root.ready = promise

      const apply = (gl: Renderer) => {
        const state = store.getState()
        // Set up renderer (one time only!)
        if (!state.gl) {
          // R3F owns what it builds, a factory's result included, since it calls the factory
          // once per root. A renderer instance belongs to the caller
          root.ownsRenderer = !isRenderer(props.gl)
          state.set({ gl: gl as THREE.WebGLRenderer })
        }
        applyRootConfiguration(root, canvas, props)
        // Only a range, including the default one, follows the display: a fixed dpr never touches matchMedia
        if (!root.unwatchDpr && (props.dpr === undefined || Array.isArray(props.dpr))) root.unwatchDpr = followDpr(root)
        resolve(this)
      }
      const run = () => {
        try {
          const gl = store.getState().gl ?? createRenderer(canvas, props.gl)
          // Only an async renderer factory makes configuration asynchronous
          if (isPromiseLike(gl)) Promise.resolve(gl).then(apply).catch(reject)
          else apply(gl)
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
      if (!store.getState().gl && root.ready.status === 'fulfilled') this.configure()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <context.Provider value={store}>{children}</context.Provider>
}

/**
 * Moving to another display or zooming changes window.devicePixelRatio without resizing the canvas,
 * so nothing configures the root again. Resolves the ratio the way configuration does, from the last
 * applied dpr. Returns the function that stops following.
 */
function followDpr(root: Root): () => void {
  const xr = () => root.store.getState().gl?.xr
  const follow = (): void => {
    const state = root.store.getState()
    // three doesn't resize during XR and restores its own pixel ratio once the session ends. It holds
    // the session before it sets isPresenting. Listeners are deduplicated, so this waits once
    if (xr()?.isPresenting || xr()?.getSession?.()) {
      xr()!.addEventListener('sessionend', follow)
      return
    }
    xr()?.removeEventListener?.('sessionend', follow)
    // A failed configuration applies everything on the next one
    const last = root.configuration.previous
    if (!last) return
    const dpr = last.dpr ?? [1, 2]
    if (state.viewport.dpr !== calculateDpr(dpr)) state.setDpr(dpr)
  }
  const unwatch = watchDpr(follow)
  return () => {
    unwatch()
    xr()?.removeEventListener?.('sessionend', follow)
  }
}

/**
 * Frees a renderer R3F built. WebGLRenderer.dispose() releases programs and caches but keeps its
 * context until garbage collection, and browsers cap live WebGL contexts, so the context is lost
 * after it. A WebGPURenderer (from a factory) releases its device and context inside dispose().
 */
function disposeRenderer(gl: THREE.WebGLRenderer): void | Promise<void> {
  // Avoid starting initialization through three's dispose(). A factory must await init()
  // before returning its renderer so readiness includes initialization and teardown can wait.
  if ((gl as { hasInitialized?: () => boolean }).hasInitialized?.() === false) return
  const disposed: unknown = attempt(() => (gl.dispose ? gl.dispose() : gl.renderLists?.dispose?.()))
  // WebGPURenderer.dispose() is async from three r186
  if (isPromiseLike(disposed)) {
    return Promise.resolve(disposed)
      .catch((error) => console.warn('[R3F] Error disposing renderer', error))
      .then(() => attempt(() => gl.forceContextLoss?.()))
  }
  attempt(() => gl.forceContextLoss?.())
}

function attempt<T>(step: () => T): T | undefined {
  try {
    return step()
  } catch (error) {
    console.warn('[R3F] Error while unmounting root; teardown may be incomplete:', error)
  }
}

export function unmountComponentAtNode<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
  callback?: (canvas: TCanvas) => void,
): void {
  const root = _roots.get(canvas)
  const token = Symbol('unmount')
  if (!root || !transitionRoot(root, { type: 'unmount', token })) return

  const teardown = () => {
    // Configuration accepted before the unmount finishes first, so a renderer it creates is released too
    if (root.ready.status === 'pending') {
      root.ready.then(teardown, teardown)
      return
    }
    // Refused when the root was used again since this unmount
    if (!transitionRoot(root, { type: 'dispose', token })) return
    // Close the gates before invoking user cleanup code.
    _roots.delete(canvas)

    const state = root.store.getState()
    state.internal.active = false

    // Release what uses the renderer before the renderer itself
    attempt(() => root.unwatchDpr?.())
    attempt(() => state.events.disconnect?.())
    if (state.gl?.xr) attempt(() => state.xr.disconnect())
    if (state.scene) attempt(() => dispose(state.scene))

    const gl = state.gl
    let disposal: void | Promise<void> = undefined
    if (gl && root.ownsRenderer) {
      disposal = attempt(() => disposeRenderer(gl))
    } else if (gl) {
      // A renderer passed in keeps its 9.x teardown: its context is lost but it is not disposed
      attempt(() => gl.renderLists?.dispose?.())
      attempt(() => gl.forceContextLoss?.())
    }

    if (isPromiseLike(disposal)) disposal.then(() => callback?.(canvas))
    else callback?.(canvas)
  }

  reconciler.updateContainer(null, root.fiber, null, () => {
    // A root used again since the unmount keeps its new children
    if (root.state.status !== 'closing' || root.state.token !== token) return
    // Effect cleanups flush before the next update
    reconciler.updateContainer(null, root.fiber, null, teardown)
  })
}
