import * as THREE from '#three'
import { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU, WebGLRenderer, WebGPURenderer, Inspector } from '#three'

import type { Object3D } from '#three'
import type { JSX, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { ConcurrentRoot } from 'react-reconciler/constants'
import { createWithEqualityFn } from 'zustand/traditional'

import { useStore } from './hooks'
import { advance, invalidate } from './loop'
import { reconciler } from './reconciler'
import { context, createStore } from './store'
import {
  applyProps,
  calculateDpr,
  dispose,
  is,
  prepare,
  updateCamera,
  useIsomorphicLayoutEffect,
  useMutableCallback,
} from './utils'
import { notifyDepreciated } from './notices'
import { Scheduler } from './hooks/useFrameNext/scheduler'

import type {
  RootState,
  RootStore,
  Size,
  EventManager,
  ThreeCamera,
  EquConfig,
  Root,
  RenderProps,
  ReconcilerRoot,
  InjectState,
} from '#types'

export const isRenderer = (def: any) => !!def?.render

// Shim for OffscreenCanvas since it was removed from DOM types
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/54988
interface OffscreenCanvas extends EventTarget {}

export const _roots = new Map<HTMLCanvasElement | OffscreenCanvas, Root>()

const shallowLoose = { objects: 'shallow', strict: false } as EquConfig

// Helper to resolve renderer config (handles: function | instance | props)
async function resolveRenderer<T>(
  config: any,
  defaultProps: Record<string, any>,
  RendererClass: new (props: any) => T,
): Promise<T> {
  if (typeof config === 'function') return await config(defaultProps)
  if (isRenderer(config)) return config as T
  return new RendererClass({ ...defaultProps, ...config })
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
  let lastCamera: RenderProps<TCanvas>['camera']

  let configured = false
  let pending: Promise<void> | null = null

  return {
    async configure(props: RenderProps<TCanvas> = {}): Promise<ReconcilerRoot<TCanvas>> {
      let resolve!: () => void
      pending = new Promise<void>((_resolve) => (resolve = _resolve))

      let {
        gl: glConfig,
        renderer: rendererConfig,
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

      //* Renderer Initialization ==============================

      const defaultGLProps = {
        canvas: canvas as HTMLCanvasElement,
        powerPreference: 'high-performance' as const,
        antialias: true,
        alpha: true,
      }

      const defaultGPUProps = {
        canvas: canvas as HTMLCanvasElement,
      }

      //* Build Flag Validation ==============================
      // Check if the requested renderer is available in this build
      if (glConfig && !R3F_BUILD_LEGACY) {
        throw new Error(
          'WebGLRenderer (gl prop) is not available in this build. ' +
            'Use @react-three/fiber or @react-three/fiber/legacy instead.',
        )
      }
      if (rendererConfig && !R3F_BUILD_WEBGPU) {
        throw new Error(
          'WebGPURenderer (renderer prop) is not available in this build. ' +
            'Use @react-three/fiber or @react-three/fiber/webgpu instead.',
        )
      }

      // Determine which renderer to use based on props and build flags
      const wantsGL = R3F_BUILD_LEGACY && (state.isLegacy || glConfig || !R3F_BUILD_WEBGPU || !rendererConfig)

      if (glConfig && rendererConfig) {
        throw new Error('Cannot use both gl and renderer props at the same time')
      }

      // Deprecation warning for WebGL usage (only in builds that support both)
      if (R3F_BUILD_LEGACY && R3F_BUILD_WEBGPU && !state.isLegacy && wantsGL) {
        notifyDepreciated({
          heading: 'WebGlRenderer Usage',
          body: 'WebGlRenderer usage is deprecated in favor of WebGPU. Import from /legacy directly or upgrade to WebGPU.',
          link: 'https://docs.pmnd.rs/react-three-fiber/api/renderer',
        })
      }

      let renderer = state.internal.actualRenderer as WebGPURenderer | WebGLRenderer

      //* Create Renderer (one time only) ==============================
      if (R3F_BUILD_LEGACY && wantsGL && !state.internal.actualRenderer) {
        //* WebGL path ---
        renderer = (await resolveRenderer(glConfig, defaultGLProps, WebGLRenderer)) as WebGLRenderer
        state.internal.actualRenderer = renderer
        // Set both gl and renderer to the WebGLRenderer for backwards compatibility
        state.set({ isLegacy: true, gl: renderer, renderer: renderer })
      } else if (R3F_BUILD_WEBGPU && !wantsGL && !state.internal.actualRenderer) {
        //* WebGPU path ---
        renderer = (await resolveRenderer(rendererConfig, defaultGPUProps, WebGPURenderer)) as WebGPURenderer

        // WebGPU-specific setup
        await renderer.init()

        renderer.inspector = new Inspector()

        const backend = renderer.backend
        const isWebGPUBackend = backend && 'isWebGPUBackend' in backend

        state.internal.actualRenderer = renderer
        // Set renderer to WebGPURenderer, gl stays null (not available in WebGPU-only)
        state.set({ webGPUSupported: isWebGPUBackend, renderer: renderer })
      }

      //* Default Raycaster Initialization ==============================
      // Set up raycaster (one time only!)
      let raycaster = state.raycaster
      if (!raycaster) state.set({ raycaster: (raycaster = new THREE.Raycaster()) })

      // Set raycaster options
      const { params, ...options } = raycastOptions || {}
      if (!is.equ(options, raycaster, shallowLoose)) applyProps(raycaster, { ...options } as any)
      if (!is.equ(params, raycaster.params, shallowLoose))
        applyProps(raycaster, { params: { ...raycaster.params, ...params } } as any)

      //* Default Camera Initialization ==============================
      // Create default camera, don't overwrite any user-set state
      if (!state.camera || (state.camera === lastCamera && !is.equ(lastCamera, cameraOptions, shallowLoose))) {
        lastCamera = cameraOptions
        const isCamera = (cameraOptions as unknown as ThreeCamera | undefined)?.isCamera
        const camera = isCamera
          ? (cameraOptions as ThreeCamera)
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
              const projectionProps = ['aspect', 'left', 'right', 'bottom', 'top']
              if (projectionProps.some((prop) => prop in cameraOptions)) {
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

        if ((sceneOptions as unknown as THREE.Scene | undefined)?.isScene) {
          scene = sceneOptions as THREE.Scene
          prepare(scene, store, '', {})
        } else {
          scene = new THREE.Scene()
          prepare(scene, store, '', {})
          if (sceneOptions) applyProps(scene as any, sceneOptions as any)
        }

        state.set({ scene })
      }

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

      // Set up XR (one time only!)
      if (!state.xr) {
        // Handle frame behavior in WebXR
        const handleXRFrame: XRFrameRequestCallback = (timestamp: number, frame?: XRFrame) => {
          const state = store.getState()
          if (state.frameloop === 'never') return
          advance(timestamp, true, state, frame)
        }

        const actualRenderer = state.internal.actualRenderer

        // Toggle render switching on session
        const handleSessionChange = () => {
          const state = store.getState()
          const renderer = state.internal.actualRenderer
          actualRenderer.xr.enabled = actualRenderer.xr.isPresenting

          renderer.xr.setAnimationLoop(renderer.xr.isPresenting ? handleXRFrame : null)
          if (!renderer.xr.isPresenting) invalidate(state)
        }

        // WebXR session manager
        const xr = {
          connect() {
            const { gl, renderer, isLegacy } = store.getState()
            const actualRenderer = renderer || gl
            actualRenderer.xr.addEventListener('sessionstart', handleSessionChange)
            actualRenderer.xr.addEventListener('sessionend', handleSessionChange)
          },
          disconnect() {
            const { gl, renderer, isLegacy } = store.getState()
            const actualRenderer = renderer || gl
            actualRenderer.xr.removeEventListener('sessionstart', handleSessionChange)
            actualRenderer.xr.removeEventListener('sessionend', handleSessionChange)
          },
        }

        // Subscribe to WebXR session events
        if (typeof renderer.xr?.addEventListener === 'function') xr.connect()
        state.set({ xr })
      }

      // Set shadowmap
      if (renderer.shadowMap) {
        const oldEnabled = renderer.shadowMap.enabled
        const oldType = renderer.shadowMap.type
        renderer.shadowMap.enabled = !!shadows

        if (is.boo(shadows)) {
          renderer.shadowMap.type = THREE.PCFSoftShadowMap
        } else if (is.str(shadows)) {
          const types = {
            basic: THREE.BasicShadowMap,
            percentage: THREE.PCFShadowMap,
            soft: THREE.PCFSoftShadowMap,
            variance: THREE.VSMShadowMap,
          }
          renderer.shadowMap.type = types[shadows as keyof typeof types] ?? THREE.PCFSoftShadowMap
        } else if (is.obj(shadows)) {
          Object.assign(renderer.shadowMap as any, shadows)
        }

        if (oldEnabled !== renderer.shadowMap.enabled || oldType !== renderer.shadowMap.type)
          (renderer.shadowMap as any).needsUpdate = true
      }

      THREE.ColorManagement.enabled = !legacy

      // Set color space and tonemapping preferences
      if (!configured) {
        renderer.outputColorSpace = linear ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
        renderer.toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping
      }

      // Update color management state
      if (state.legacy !== legacy) state.set(() => ({ legacy }))
      if (state.linear !== linear) state.set(() => ({ linear }))
      if (state.flat !== flat) state.set(() => ({ flat }))

      // Set gl props
      if (glConfig && !is.fun(glConfig) && !isRenderer(glConfig) && !is.equ(glConfig, renderer, shallowLoose))
        applyProps(renderer, glConfig as any)

      // Set renderer props (WebGPU)
      if (rendererConfig && !is.fun(rendererConfig) && !isRenderer(rendererConfig) && state.renderer) {
        const currentRenderer = state.renderer
        if (!is.equ(rendererConfig, currentRenderer, shallowLoose)) {
          applyProps(currentRenderer, rendererConfig as any)
        }
      }

      //* Scheduler Initialization (useFrameNext) ==============================
      // Create scheduler if it doesn't exist
      if (!state.internal.scheduler) {
        const scheduler = Scheduler.create(() => store.getState())
        scheduler.frameloop = frameloop
        // Start scheduler if frameloop is 'always' (setter won't start since default is 'always')
        if (frameloop === 'always') scheduler.start()
        state.set((state) => ({
          internal: { ...state.internal, scheduler },
        }))
      } else {
        // Update scheduler frameloop mode if it changed
        state.internal.scheduler.frameloop = frameloop
      }

      // Set locals
      onCreated = onCreatedCallback
      configured = true
      resolve()
      return this
    },
    render(children: ReactNode): RootStore {
      // The root has to be configured before it can be rendered
      if (!configured && !pending) this.configure()

      pending!.then(() => {
        reconciler.updateContainer(
          <Provider store={store} children={children} onCreated={onCreated} rootElement={canvas} />,
          fiber,
          null,
          () => undefined,
        )
      })

      return store
    },
    unmount(): void {
      unmountComponentAtNode(canvas)
    },
  }
}

interface ProviderProps<TCanvas extends HTMLCanvasElement | OffscreenCanvas> {
  onCreated?: (state: RootState) => void
  store: RootStore
  children: ReactNode
  rootElement: TCanvas
}

function Provider<TCanvas extends HTMLCanvasElement | OffscreenCanvas>({
  store,
  children,
  onCreated,
  rootElement,
}: ProviderProps<TCanvas>): JSX.Element {
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
            const renderer = state.internal.actualRenderer

            // Stop and disconnect the scheduler (useFrameNext)
            const scheduler = state.internal.scheduler as Scheduler | null
            if (scheduler) {
              scheduler.stop()
              scheduler.disconnect()
            }

            state.events.disconnect?.()
            renderer?.renderLists?.dispose?.()
            renderer?.forceContextLoss?.()
            if (renderer?.xr) state.xr.disconnect()
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

export function createPortal(children: ReactNode, container: THREE.Object3D, state?: InjectState): JSX.Element {
  return <Portal children={children} container={container} state={state} />
}

interface PortalProps {
  children: ReactNode
  state?: InjectState
  container: Object3D
}

function Portal({ state = {}, children, container }: PortalProps): JSX.Element {
  /** This has to be a component because it would not be able to call useThree/useStore otherwise since
   *  if this is our environment, then we are not in r3f's renderer but in react-dom, it would trigger
   *  the "R3F hooks can only be used within the Canvas component!" warning:
   *  <Canvas>
   *    {createPortal(...)} */
  const { events, size, ...rest } = state
  const previousRoot = useStore()
  const [raycaster] = useState(() => new THREE.Raycaster())
  const [pointer] = useState(() => new THREE.Vector2())

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

  const usePortalStore = useMemo(() => {
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
