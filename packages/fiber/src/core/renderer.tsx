import * as React from 'react'
import { ConcurrentRoot } from '../../react-reconciler/constants.js'
import * as THREE from 'three'
import { createWithEqualityFn } from 'zustand/traditional'

import type { ThreeElement } from '../three-types'
import { ComputeFunction, EventManager } from './events'
import { useStore } from './hooks'
import { advance, invalidate } from './loop'
import { reconciler, Root } from './reconciler'
import { context, createStore, Dpr, Frameloop, Performance, Renderer, RootState, RootStore, Size } from './store'
import {
  type Properties,
  Camera,
  dispose,
  noop,
  updateCamera,
  useIsomorphicLayoutEffect,
  useMutableCallback,
} from './utils'
import { deferred, fulfilled, isPromiseLike, rejected, TrackedPromise } from './promise'
import { transitionRoot } from './machine'
import { applyRootConfiguration, createRenderer } from './configuration'

// Shim for OffscreenCanvas since it was removed from DOM types
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/54988
interface OffscreenCanvas extends EventTarget {}

export const _roots = new Map<HTMLCanvasElement | OffscreenCanvas, Root>()

export type DefaultGLProps = Omit<THREE.WebGLRendererParameters, 'canvas'> & {
  canvas: HTMLCanvasElement | OffscreenCanvas
}

export type GLProps =
  | Renderer
  | ((defaultProps: DefaultGLProps) => Renderer)
  | ((defaultProps: DefaultGLProps) => Promise<Renderer>)
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>

export type CameraProps = (
  | Camera
  | Partial<
      ThreeElement<typeof THREE.Camera> &
        ThreeElement<typeof THREE.PerspectiveCamera> &
        ThreeElement<typeof THREE.OrthographicCamera>
    >
) & {
  /** Flags the camera as manual, putting projection into your own hands */
  manual?: boolean
}

export interface RenderProps<TCanvas extends HTMLCanvasElement | OffscreenCanvas> {
  /** A threejs renderer instance or props that go into the default renderer */
  gl?: GLProps
  /** Dimensions to fit the renderer to. Will measure canvas dimensions if omitted */
  size?: Size
  /**
   * Enables shadows (by default PCFsoft). Can accept `gl.shadowMap` options for fine-tuning,
   * but also strings: 'basic' | 'percentage' | 'soft' | 'variance'.
   * @see https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap
   */
  shadows?: boolean | 'basic' | 'percentage' | 'soft' | 'variance' | Partial<THREE.WebGLShadowMap>
  /**
   * Disables three r139 color management.
   * @see https://threejs.org/manual/#en/color-management
   */
  legacy?: boolean
  /** Switch off automatic sRGB encoding and gamma correction */
  linear?: boolean
  /** Use `THREE.NoToneMapping` instead of `THREE.ACESFilmicToneMapping` */
  flat?: boolean
  /** Creates an orthographic camera */
  orthographic?: boolean
  /**
   * R3F's render mode. Set to `demand` to only render on state change or `never` to take control.
   * @see https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance#on-demand-rendering
   */
  frameloop?: Frameloop
  /**
   * R3F performance options for adaptive performance.
   * @see https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance#movement-regression
   */
  performance?: Partial<Omit<Performance, 'regress'>>
  /** Target pixel ratio. Can clamp between a range: `[min, max]` */
  dpr?: Dpr
  /** Props that go into the default raycaster */
  raycaster?: Partial<THREE.Raycaster>
  /** A `THREE.Scene` instance or props that go into the default scene */
  scene?: THREE.Scene | Partial<THREE.Scene>
  /** A `THREE.Camera` instance or props that go into the default camera */
  camera?: CameraProps
  /** An R3F event manager to manage elements' pointer events */
  events?: (store: RootStore) => EventManager<HTMLElement>
  /** Callback after the canvas has rendered (but not yet committed) */
  onCreated?: (state: RootState) => void
  /** Response for pointer clicks that have missed any target */
  onPointerMissed?: (event: MouseEvent) => void
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
  const root: Root = prevRoot || { fiber, store, state: { status: 'open' }, ready: fulfilled(undefined) }
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
        applyRootConfiguration(store, canvas, props, gl)
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
        const onCreated = store.getState().internal.configuration.previous?.onCreated
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
    attempt(() => state.events.disconnect?.())
    if (state.gl?.xr) attempt(() => state.xr.disconnect())
    if (state.scene) attempt(() => dispose(state.scene))

    const gl = state.gl
    let disposal: void | Promise<void> = undefined
    if (gl && state.internal.ownsRenderer) {
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

export type InjectState = Partial<
  Omit<RootState, 'events'> & {
    events?: {
      enabled?: boolean
      priority?: number
      compute?: ComputeFunction
      connected?: any
    }
  }
>

export function createPortal(
  children: React.ReactNode,
  container: THREE.Object3D,
  state?: InjectState,
): React.JSX.Element {
  return <Portal children={children} container={container} state={state} />
}

interface PortalProps {
  children: React.ReactNode
  state?: InjectState
  container: THREE.Object3D
}

function Portal({ state = {}, children, container }: PortalProps): React.JSX.Element {
  /** This has to be a component because it would not be able to call useThree/useStore otherwise since
   *  if this is our environment, then we are not in r3f's renderer but in react-dom, it would trigger
   *  the "R3F hooks can only be used within the Canvas component!" warning:
   *  <Canvas>
   *    {createPortal(...)} */
  const { events, size, ...rest } = state
  const previousRoot = useStore()
  const [raycaster] = React.useState(() => new THREE.Raycaster())
  const [pointer] = React.useState(() => new THREE.Vector2())

  const inject = useMutableCallback((rootState: RootState, injectState: RootState) => {
    let viewport = undefined
    if (injectState.camera && size) {
      const camera = injectState.camera
      // Calculate the override viewport, if present
      viewport = rootState.viewport.getCurrentViewport(camera, new THREE.Vector3(), size)
      // Update the portal camera, if it differs from the previous layer
      if (camera !== rootState.camera) updateCamera(camera, size)
    }

    return {
      // The intersect consists of the previous root state
      ...rootState,
      ...injectState,
      // Portals have their own scene, which forms the root, a raycaster and a pointer
      scene: container as THREE.Scene,
      raycaster,
      pointer,
      mouse: pointer,
      // Their previous root is the layer before it
      previousRoot,
      // Events, size and viewport can be overridden by the inject layer
      events: { ...rootState.events, ...injectState.events, ...events },
      size: { ...rootState.size, ...size },
      viewport: { ...rootState.viewport, ...viewport },
      // Layers are allowed to override events
      setEvents: (events: Partial<EventManager<any>>) =>
        injectState.set((state) => ({ ...state, events: { ...state.events, ...events } })),
    } as RootState
  })

  const usePortalStore = React.useMemo(() => {
    // Create a mirrored store, based on the previous root with a few overrides ...
    const store = createWithEqualityFn<RootState>((set, get) => ({ ...rest, set, get } as RootState))

    // Subscribe to previous root-state and copy changes over to the mirrored portal-state
    const onMutate = (prev: RootState) => store.setState((state) => inject.current(prev, state))
    onMutate(previousRoot.getState())
    previousRoot.subscribe(onMutate)

    return store
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousRoot, container])

  return (
    // @ts-ignore, reconciler types are not maintained
    <>
      {reconciler.createPortal(
        <context.Provider value={usePortalStore}>{children}</context.Provider>,
        usePortalStore,
        null,
      )}
    </>
  )
}

/**
 * Force React to flush any updates inside the provided callback synchronously and immediately.
 * All the same caveats documented for react-dom's `flushSync` apply here (see https://react.dev/reference/react-dom/flushSync).
 * Nevertheless, sometimes one needs to render synchronously, for example to keep DOM and 3D changes in lock-step without
 * having to revert to a non-React solution. Note: this will only flush updates within the `Canvas` root.
 */
export function flushSync<R>(fn: () => R): R {
  // @ts-ignore - reconciler types are not maintained
  return reconciler.flushSyncFromReconciler(fn)
}
