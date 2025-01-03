import * as THREE from 'three'
import * as React from 'react'
import { ConcurrentRoot } from 'react-reconciler/constants'
import { createWithEqualityFn } from 'zustand/traditional'

import type { ThreeElement } from '../three-types'
import {
  Renderer,
  createStore,
  isRenderer,
  context,
  RootState,
  Size,
  Dpr,
  Performance,
  Frameloop,
  RootStore,
} from './store'
import { reconciler, Root } from './reconciler'
import { invalidate, advance } from './loop'
import { EventManager, ComputeFunction } from './events'
import {
  type Properties,
  is,
  dispose,
  calculateDpr,
  EquConfig,
  useIsomorphicLayoutEffect,
  Camera,
  updateCamera,
  applyProps,
  prepare,
  useMutableCallback,
  getColorManagement,
} from './utils'
import { useStore } from './hooks'

// Shim for OffscreenCanvas since it was removed from DOM types
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/54988
interface OffscreenCanvas extends EventTarget {}

export const _roots = new Map<HTMLCanvasElement | OffscreenCanvas, Root>()

const shallowLoose = { objects: 'shallow', strict: false } as EquConfig

export type GLProps =
  | Renderer
  | ((canvas: HTMLCanvasElement | OffscreenCanvas) => Renderer)
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

const createRendererInstance = <TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  gl: GLProps | undefined,
  canvas: TCanvas,
): THREE.WebGLRenderer => {
  const customRenderer = (typeof gl === 'function' ? gl(canvas) : gl) as THREE.WebGLRenderer
  if (isRenderer(customRenderer)) return customRenderer

  return new THREE.WebGLRenderer({
    powerPreference: 'high-performance',
    canvas: canvas as HTMLCanvasElement,
    antialias: true,
    alpha: true,
    ...gl,
  })
}

export interface ReconcilerRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas> {
  configure: (config?: RenderProps<TCanvas>) => ReconcilerRoot<TCanvas>
  render: (element: React.ReactNode) => RootStore
  unmount: () => void
}

function computeInitialSize(canvas: HTMLCanvasElement | OffscreenCanvas, size?: Size): Size {
  if (
    !size &&
    typeof HTMLCanvasElement !== 'undefined' &&
    canvas instanceof HTMLCanvasElement &&
    canvas.parentElement
  ) {
    const { width, height, top, left } = canvas.parentElement.getBoundingClientRect()
    return { width, height, top, left }
  } else if (!size && typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return {
      width: canvas.width,
      height: canvas.height,
      top: 0,
      left: 0,
    }
  }

  return { width: 0, height: 0, top: 0, left: 0, ...size }
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
  if (!prevRoot) _roots.set(canvas, { fiber, store })

  // Locals
  let onCreated: ((state: RootState) => void) | undefined
  let configured = false
  let lastCamera: RenderProps<TCanvas>['camera']

  return {
    configure(props: RenderProps<TCanvas> = {}): ReconcilerRoot<TCanvas> {
      let {
        gl: glConfig,
        size: propsSize,
        scene: sceneOptions,
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
      if (!is.equ(options, raycaster, shallowLoose)) applyProps(raycaster, { ...options } as any)
      if (!is.equ(params, raycaster.params, shallowLoose))
        applyProps(raycaster, { params: { ...raycaster.params, ...params } } as any)

      // Create default camera, don't overwrite any user-set state
      if (!state.camera || (state.camera === lastCamera && !is.equ(lastCamera, cameraOptions, shallowLoose))) {
        lastCamera = cameraOptions
        const isCamera = cameraOptions instanceof THREE.Camera
        const camera = isCamera
          ? (cameraOptions as Camera)
          : orthographic
          ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
          : new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
        if (!isCamera) {
          camera.position.z = 5
          if (cameraOptions) {
            applyProps(camera, cameraOptions as any)
            // Preserve user-defined frustum if possible
            // https://github.com/pmndrs/react-three-fiber/issues/3160
            if (!(camera as any).manual) {
              if (
                'aspect' in cameraOptions ||
                'left' in cameraOptions ||
                'right' in cameraOptions ||
                'bottom' in cameraOptions ||
                'top' in cameraOptions
              ) {
                ;(camera as any).manual = true
                camera.updateProjectionMatrix()
              }
            }
          }
          // Always look at center by default
          if (!state.camera && !cameraOptions?.rotation) camera.lookAt(0, 0, 0)
        }
        state.set({ camera })

        // Configure raycaster
        // https://github.com/pmndrs/react-xr/issues/300
        raycaster.camera = camera
      }

      // Set up scene (one time only!)
      if (!state.scene) {
        let scene: THREE.Scene

        if (sceneOptions instanceof THREE.Scene) {
          scene = sceneOptions
          prepare(scene, store, '', {})
        } else {
          scene = new THREE.Scene()
          prepare(scene, store, '', {})
          if (sceneOptions) applyProps(scene as any, sceneOptions as any)
        }

        state.set({ scene })
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
        const oldEnabled = gl.shadowMap.enabled
        const oldType = gl.shadowMap.type
        gl.shadowMap.enabled = !!shadows

        if (is.boo(shadows)) {
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        } else if (is.str(shadows)) {
          const types = {
            basic: THREE.BasicShadowMap,
            percentage: THREE.PCFShadowMap,
            soft: THREE.PCFSoftShadowMap,
            variance: THREE.VSMShadowMap,
          }
          gl.shadowMap.type = types[shadows] ?? THREE.PCFSoftShadowMap
        } else if (is.obj(shadows)) {
          Object.assign(gl.shadowMap, shadows)
        }

        if (oldEnabled !== gl.shadowMap.enabled || oldType !== gl.shadowMap.type) gl.shadowMap.needsUpdate = true
      }

      // Safely set color management if available.
      // Avoid accessing THREE.ColorManagement to play nice with older versions
      const ColorManagement = getColorManagement()
      if (ColorManagement) {
        if ('enabled' in ColorManagement) ColorManagement.enabled = !legacy
        else if ('legacyMode' in ColorManagement) ColorManagement.legacyMode = legacy
      }

      // Set color space and tonemapping preferences
      if (!configured) {
        const LinearEncoding = 3000
        const sRGBEncoding = 3001
        applyProps(
          gl as any,
          {
            outputEncoding: linear ? LinearEncoding : sRGBEncoding,
            toneMapping: flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping,
          } as Partial<Properties<THREE.WebGLRenderer>>,
        )
      }

      // Update color management state
      if (state.legacy !== legacy) state.set(() => ({ legacy }))
      if (state.linear !== linear) state.set(() => ({ linear }))
      if (state.flat !== flat) state.set(() => ({ flat }))

      // Set gl props
      if (glConfig && !is.fun(glConfig) && !isRenderer(glConfig) && !is.equ(glConfig, gl, shallowLoose))
        applyProps(gl, glConfig as any)
      // Store events internally
      if (events && !state.events.handlers) state.set({ events: events(store) })
      // Check size, allow it to take on container bounds initially
      const size = computeInitialSize(canvas, propsSize)
      if (!is.equ(size, state.size, shallowLoose)) {
        state.setSize(size.width, size.height, size.top, size.left)
      }
      // Check pixelratio
      if (dpr && state.viewport.dpr !== calculateDpr(dpr)) state.setDpr(dpr)
      // Check frameloop
      if (state.frameloop !== frameloop) state.setFrameloop(frameloop)
      // Check pointer missed
      if (!state.onPointerMissed) state.set({ onPointerMissed })
      // Check performance
      if (performance && !is.equ(performance, state.performance, shallowLoose))
        state.set((state) => ({ performance: { ...state.performance, ...performance } }))

      // Set locals
      onCreated = onCreatedCallback
      configured = true

      return this
    },
    render(children: React.ReactNode): RootStore {
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
    unmount(): void {
      unmountComponentAtNode(canvas)
    },
  }
}

export function render<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  children: React.ReactNode,
  canvas: TCanvas,
  config: RenderProps<TCanvas>,
): RootStore {
  console.warn('R3F.render is no longer supported in React 18. Use createRoot instead!')
  const root = createRoot(canvas)
  root.configure(config)
  return root.render(children)
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
    // Notifiy that init is completed, the scene graph exists, but nothing has yet rendered
    if (onCreated) onCreated(state)
    // Connect events to the targets parent, this is done to ensure events are registered on
    // a shared target, and not on the canvas itself
    if (!store.getState().events.connected) state.events.connect?.(rootElement)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <context.Provider value={store}>{children}</context.Provider>
}

export function unmountComponentAtNode<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
  callback?: (canvas: TCanvas) => void,
): void {
  const root = _roots.get(canvas)
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
            dispose(state.scene)
            _roots.delete(canvas)
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
 * having to revert to a non-React solution.
 */
export function flushSync<R>(fn: () => R): R {
  // `flushSync` implementation only takes one argument. I don't know what's up with the type declaration for it.
  return reconciler.flushSync(fn)
}

reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: '@react-three/fiber',
  version: React.version,
})
