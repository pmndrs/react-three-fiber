import * as THREE from 'three'
import * as React from 'react'
import { ConcurrentRoot } from 'react-reconciler/constants'
import create, { StoreApi, UseBoundStore } from 'zustand'

import * as ReactThreeFiber from '../three-types'
import {
  Renderer,
  createStore,
  isRenderer,
  context,
  RootState,
  Size,
  Dpr,
  Performance,
  PrivateKeys,
  privateKeys,
  Subscription,
  FrameloopLegacy,
  Frameloop,
} from './store'
import { createRenderer, extend, Root } from './renderer'
import { createLoop, addEffect, addAfterEffect, addTail } from './loop'
import { getEventPriority, EventManager, ComputeFunction } from './events'
import {
  is,
  dispose,
  calculateDpr,
  EquConfig,
  getRootState,
  useIsomorphicLayoutEffect,
  Camera,
  updateCamera,
} from './utils'
import { useStore } from './hooks'
import { Stage, Lifecycle, Stages } from './stages'
import { OffscreenCanvas } from 'three'

const roots = new Map<Element, Root>()
const { invalidate, advance } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots, getEventPriority)
const shallowLoose = { objects: 'shallow', strict: false } as EquConfig

type Properties<T> = Pick<T, { [K in keyof T]: T[K] extends (_: any) => any ? never : K }[keyof T]>

type GLProps =
  | Renderer
  | ((canvas: HTMLCanvasElement) => Renderer)
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>
  | undefined

export type RenderProps<TCanvas extends Element> = {
  /** A threejs renderer instance or props that go into the default renderer */
  gl?: GLProps
  /** Dimensions to fit the renderer to. Will measure canvas dimensions if omitted */
  size?: Size
  /**
   * Enables PCFsoft shadows. Can accept `gl.shadowMap` options for fine-tuning.
   * @see https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap
   */
  shadows?: boolean | Partial<THREE.WebGLShadowMap>
  /**
   * Disables three r139 color management.
   * @see https://threejs.org/docs/#manual/en/introduction/Color-management
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
  /** A `THREE.Camera` instance or props that go into the default camera */
  camera?: (
    | Camera
    | Partial<
        ReactThreeFiber.Object3DNode<THREE.Camera, typeof THREE.Camera> &
          ReactThreeFiber.Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera> &
          ReactThreeFiber.Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
      >
  ) & {
    /** Flags the camera as manual, putting projection into your own hands */
    manual?: boolean
  }
  /** An R3F event manager to manage elements' pointer events */
  events?: (store: UseBoundStore<RootState>) => EventManager<HTMLElement>
  /** Callback after the canvas has rendered (but not yet committed) */
  onCreated?: (state: RootState) => void
  /** Response for pointer clicks that have missed any target */
  onPointerMissed?: (event: MouseEvent) => void
  /** Create a custom lifecycle of stages */
  stages?: Stage[]
  render?: 'auto' | 'manual'
}

const createRendererInstance = <TElement extends Element>(gl: GLProps, canvas: TElement): THREE.WebGLRenderer => {
  const customRenderer = (
    typeof gl === 'function' ? gl(canvas as unknown as HTMLCanvasElement) : gl
  ) as THREE.WebGLRenderer
  if (isRenderer(customRenderer)) return customRenderer
  else
    return new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      canvas: canvas,
      antialias: true,
      alpha: true,
      ...gl,
    })
}

const createStages = (stages: Stage[] | undefined, store: UseBoundStore<RootState, StoreApi<RootState>>) => {
  const state = store.getState()
  let subscribers: Subscription[]
  let subscription: Subscription

  stages = stages ?? Lifecycle

  if (!stages.includes(Stages.Update)) throw 'The Stages.Update stage is required for R3F.'
  if (!stages.includes(Stages.Render)) throw 'The Stages.Render stage is required for R3F.'

  state.set(({ internal }) => ({ internal: { ...internal, stages: stages! } }))

  // Add useFrame loop to update stage
  const frameCallback = {
    current: (state: RootState, delta: number, frame?: XRFrame | undefined) => {
      subscribers = state.internal.subscribers
      for (let i = 0; i < subscribers.length; i++) {
        subscription = subscribers[i]
        subscription.ref.current(subscription.store.getState(), delta, frame)
      }
    },
  }
  Stages.Update.add(frameCallback, store)

  // Add render callback to render stage
  const renderCallback = {
    current: (state: RootState) => {
      if (state.internal.render === 'auto' && state.gl.render) state.gl.render(state.scene, state.camera)
    },
  }
  Stages.Render.add(renderCallback, store)
}

export type ReconcilerRoot<TCanvas extends Element> = {
  configure: (config?: RenderProps<TCanvas>) => ReconcilerRoot<TCanvas>
  render: (element: React.ReactNode) => UseBoundStore<RootState>
  unmount: () => void
}

function isCanvas(maybeCanvas: unknown): maybeCanvas is HTMLCanvasElement {
  return maybeCanvas instanceof HTMLCanvasElement
}

function computeInitialSize(canvas: HTMLCanvasElement | OffscreenCanvas, defaultSize?: Size): Size {
  if (defaultSize) {
    return defaultSize
  }

  if (isCanvas(canvas) && canvas.parentElement) {
    const { width, height, top, left } = canvas.parentElement.getBoundingClientRect()

    return { width, height, top, left }
  }

  return { width: 0, height: 0, top: 0, left: 0 }
}

function createRoot<TCanvas extends Element>(canvas: TCanvas): ReconcilerRoot<TCanvas> {
  // Check against mistaken use of createRoot
  const prevRoot = roots.get(canvas)
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
    prevFiber || reconciler.createContainer(store, ConcurrentRoot, null, false, null, '', logRecoverableError, null)
  // Map it
  if (!prevRoot) roots.set(canvas, { fiber, store })

  // Locals
  let onCreated: ((state: RootState) => void) | undefined
  let configured = false

  return {
    configure(props: RenderProps<TCanvas> = {}) {
      let {
        gl: glConfig,
        size: propsSize,
        events,
        onCreated: onCreatedCallback,
        shadows = false,
        linear = false,
        flat = false,
        legacy = false,
        orthographic = false,
        frameloop = 'always',
        dpr = [1, 2],
        performance,
        raycaster: raycastOptions,
        camera: cameraOptions,
        onPointerMissed,
        stages,
      } = props

      let state = store.getState()

      // Set up renderer (one time only!)
      let gl = state.gl
      if (!state.gl) state.set({ gl: (gl = createRendererInstance(glConfig, canvas)) })

      // Set up raycaster (one time only!)
      let raycaster = state.raycaster
      if (!raycaster) state.set({ raycaster: (raycaster = new THREE.Raycaster()) })

      // Set raycaster options
      const { params, ...options } = raycastOptions || {}
      if (!is.equ(options, raycaster, shallowLoose)) applyProps(raycaster as any, { ...options })
      if (!is.equ(params, raycaster.params, shallowLoose))
        applyProps(raycaster as any, { params: { ...raycaster.params, ...params } })

      // Create default camera (one time only!)
      if (!state.camera) {
        const isCamera = cameraOptions instanceof THREE.Camera
        const camera = isCamera
          ? (cameraOptions as Camera)
          : orthographic
          ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
          : new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
        if (!isCamera) {
          camera.position.z = 5
          if (cameraOptions) applyProps(camera as any, cameraOptions as any)
          // Always look at center by default
          if (!cameraOptions?.rotation) camera.lookAt(0, 0, 0)
        }
        state.set({ camera })
      }

      // Set up XR (one time only!)
      if (!state.xr) {
        // Handle frame behavior in WebXR
        const handleXRFrame: XRFrameRequestCallback = (timestamp: number, frame?: XRFrame) => {
          const state = store.getState()
          if (state.frameloop === 'never') return
          advance(timestamp, true, state, frame)
        }

        // Toggle render switching on session
        const handleSessionChange = () => {
          const state = store.getState()
          state.gl.xr.enabled = state.gl.xr.isPresenting

          state.gl.xr.setAnimationLoop(state.gl.xr.isPresenting ? handleXRFrame : null)
          if (!state.gl.xr.isPresenting) invalidate(state)
        }

        // WebXR session manager
        const xr = {
          connect() {
            const gl = store.getState().gl
            gl.xr.addEventListener('sessionstart', handleSessionChange)
            gl.xr.addEventListener('sessionend', handleSessionChange)
          },
          disconnect() {
            const gl = store.getState().gl
            gl.xr.removeEventListener('sessionstart', handleSessionChange)
            gl.xr.removeEventListener('sessionend', handleSessionChange)
          },
        }

        // Subscribe to WebXR session events
        if (gl.xr) xr.connect()
        state.set({ xr })
      }

      // Set shadowmap
      if (gl.shadowMap) {
        const isBoolean = is.boo(shadows)
        if ((isBoolean && gl.shadowMap.enabled !== shadows) || !is.equ(shadows, gl.shadowMap, shallowLoose)) {
          const old = gl.shadowMap.enabled
          gl.shadowMap.enabled = !!shadows
          if (!isBoolean) Object.assign(gl.shadowMap, shadows)
          else gl.shadowMap.type = THREE.PCFSoftShadowMap
          if (old !== gl.shadowMap.enabled) gl.shadowMap.needsUpdate = true
        }
      }

      // Set color management
      ;(THREE as any).ColorManagement.legacyMode = legacy
      const outputEncoding = linear ? THREE.LinearEncoding : THREE.sRGBEncoding
      const toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping
      if (gl.outputEncoding !== outputEncoding) gl.outputEncoding = outputEncoding
      if (gl.toneMapping !== toneMapping) gl.toneMapping = toneMapping

      // Update color management state
      if (state.legacy !== legacy) state.set(() => ({ legacy }))
      if (state.linear !== linear) state.set(() => ({ linear }))
      if (state.flat !== flat) state.set(() => ({ flat }))

      // Set gl props
      if (glConfig && !is.fun(glConfig) && !isRenderer(glConfig) && !is.equ(glConfig, gl, shallowLoose))
        applyProps(gl as any, glConfig as any)
      // Store events internally
      if (events && !state.events.handlers) state.set({ events: events(store) })
      // Check pixelratio
      if (dpr && state.viewport.dpr !== calculateDpr(dpr)) state.setDpr(dpr)
      // Check size, allow it to take on container bounds initially
      const size = computeInitialSize(canvas, propsSize)
      if (!is.equ(size, state.size, shallowLoose)) {
        state.setSize(size.width, size.height, size.updateStyle, size.top, size.left)
      }
      // Check frameloop
      if (state.frameloop !== frameloop) state.setFrameloop(frameloop)
      // Check pointer missed
      if (!state.onPointerMissed) state.set({ onPointerMissed })
      // Check performance
      if (performance && !is.equ(performance, state.performance, shallowLoose))
        state.set((state) => ({ performance: { ...state.performance, ...performance } }))

      // Create update stages.
      if (stages !== state.internal.stages) createStages(stages, store)

      // Set locals
      onCreated = onCreatedCallback
      configured = true

      return this
    },
    render(children: React.ReactNode) {
      // The root has to be configured before it can be rendered
      if (!configured) this.configure()

      reconciler.updateContainer(
        <Provider store={store} children={children} onCreated={onCreated} rootElement={canvas} />,
        fiber,
        null,
        () => undefined,
      )
      return store
    },
    unmount() {
      unmountComponentAtNode(canvas)
    },
  }
}

function render<TCanvas extends Element>(
  children: React.ReactNode,
  canvas: TCanvas,
  config: RenderProps<TCanvas>,
): UseBoundStore<RootState> {
  console.warn('R3F.render is no longer supported in React 18. Use createRoot instead!')
  const root = createRoot(canvas)
  root.configure(config)
  return root.render(children)
}

function Provider<TElement extends Element>({
  store,
  children,
  onCreated,
  rootElement,
}: {
  onCreated?: (state: RootState) => void
  store: UseBoundStore<RootState>
  children: React.ReactNode
  rootElement: TElement
  parent?: React.MutableRefObject<TElement | undefined>
}) {
  useIsomorphicLayoutEffect(() => {
    const state = store.getState()
    // Flag the canvas active, rendering will now begin
    state.set((state) => ({ internal: { ...state.internal, active: true } }))
    // Notifiy that init is completed, the scene graph exists, but nothing has yet rendered
    if (onCreated) onCreated(state)
    // Connect events to the targets parent, this is done to ensure events are registered on
    // a shared target, and not on the canvas itself
    if (!store.getState().events.connected) state.events.connect?.(rootElement)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <context.Provider value={store}>{children}</context.Provider>
}

function unmountComponentAtNode<TElement extends Element>(canvas: TElement, callback?: (canvas: TElement) => void) {
  const root = roots.get(canvas)
  const fiber = root?.fiber
  if (fiber) {
    const state = root?.store.getState()
    if (state) state.internal.active = false
    reconciler.updateContainer(null, fiber, null, () => {
      if (state) {
        setTimeout(() => {
          try {
            state.events.disconnect?.()
            state.gl?.renderLists?.dispose?.()
            state.gl?.forceContextLoss?.()
            if (state.gl?.xr) state.xr.disconnect()
            dispose(state)
            roots.delete(canvas)
            if (callback) callback(canvas)
          } catch (e) {
            /* ... */
          }
        }, 500)
      }
    })
  }
}

export type InjectState = Partial<
  Omit<RootState, PrivateKeys> & {
    events?: {
      enabled?: boolean
      priority?: number
      compute?: ComputeFunction
      connected?: any
    }
    size?: Size
  }
>

function createPortal(children: React.ReactNode, container: THREE.Object3D, state?: InjectState): React.ReactNode {
  return <Portal key={container.uuid} children={children} container={container} state={state} />
}

function Portal({
  state = {},
  children,
  container,
}: {
  children: React.ReactNode
  state?: InjectState
  container: THREE.Object3D
}) {
  /** This has to be a component because it would not be able to call useThree/useStore otherwise since
   *  if this is our environment, then we are not in r3f's renderer but in react-dom, it would trigger
   *  the "R3F hooks can only be used within the Canvas component!" warning:
   *  <Canvas>
   *    {createPortal(...)} */

  const { events, size, ...rest } = state
  const previousRoot = useStore()
  const [raycaster] = React.useState(() => new THREE.Raycaster())
  const [pointer] = React.useState(() => new THREE.Vector2())

  const inject = React.useCallback(
    (rootState: RootState, injectState: RootState) => {
      const intersect: Partial<RootState> = { ...rootState } // all prev state props

      // Only the fields of "rootState" that do not differ from injectState
      // Some props should be off-limits
      // Otherwise filter out the props that are different and let the inject layer take precedence
      Object.keys(rootState).forEach((key) => {
        if (
          // Some props should be off-limits
          privateKeys.includes(key as PrivateKeys) ||
          // Otherwise filter out the props that are different and let the inject layer take precedence
          rootState[key as keyof RootState] !== injectState[key as keyof RootState]
        ) {
          delete intersect[key as keyof RootState]
        }
      })

      let viewport = undefined
      if (injectState && size) {
        const camera = injectState.camera
        // Calculate the override viewport, if present
        viewport = rootState.viewport.getCurrentViewport(camera, new THREE.Vector3(), size)
        // Update the portal camera, if it differs from the previous layer
        if (camera !== rootState.camera) updateCamera(camera, size)
      }

      return {
        // The intersect consists of the previous root state
        ...intersect,
        // Portals have their own scene, which forms the root, a raycaster and a pointer
        scene: container as THREE.Scene,
        raycaster,
        pointer,
        mouse: pointer,
        // Their previous root is the layer before it
        previousRoot,
        // Events, size and viewport can be overridden by the inject layer
        events: { ...rootState.events, ...injectState?.events, ...events },
        size: { ...rootState.size, ...size },
        viewport: { ...rootState.viewport, ...viewport },
        ...rest,
      } as RootState
    },
    [state],
  )

  const [usePortalStore] = React.useState(() => {
    // Create a mirrored store, based on the previous root with a few overrides ...
    const previousState = previousRoot.getState()
    const store = create<RootState>((set, get) => ({
      ...previousState,
      scene: container as THREE.Scene,
      raycaster,
      pointer,
      mouse: pointer,
      previousRoot,
      events: { ...previousState.events, ...events },
      size: { ...previousState.size, ...size },
      ...rest,
      // Set and get refer to this root-state
      set,
      get,
      // Layers are allowed to override events
      setEvents: (events: Partial<EventManager<any>>) =>
        set((state) => ({ ...state, events: { ...state.events, ...events } })),
    }))
    return store
  })

  React.useEffect(() => {
    // Subscribe to previous root-state and copy changes over to the mirrored portal-state
    const unsub = previousRoot.subscribe((prev) => usePortalStore.setState((state) => inject(prev, state)))
    return () => {
      unsub()
      usePortalStore.destroy()
    }
  }, [])

  React.useEffect(() => {
    usePortalStore.setState((injectState) => inject(previousRoot.getState(), injectState))
  }, [inject])

  return (
    <>
      {reconciler.createPortal(
        <context.Provider value={usePortalStore}>{children}</context.Provider>,
        usePortalStore,
        null,
      )}
    </>
  )
}

reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: '@react-three/fiber',
  version: React.version,
})

const act = (React as any).unstable_act

export * from './hooks'
export {
  context,
  render,
  createRoot,
  unmountComponentAtNode,
  createPortal,
  reconciler,
  applyProps,
  dispose,
  invalidate,
  advance,
  extend,
  addEffect,
  addAfterEffect,
  addTail,
  getRootState,
  act,
  roots as _roots,
}
