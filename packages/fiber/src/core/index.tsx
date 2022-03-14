import * as THREE from 'three'
import * as React from 'react'
// @ts-ignore
import { ConcurrentRoot } from 'react-reconciler/constants'
import { UseStore } from 'zustand'

import { Renderer, createStore, StoreProps, isRenderer, context, RootState, Size, Camera } from './store'
import { createRenderer, extend, Root } from './renderer'
import { createLoop, addEffect, addAfterEffect, addTail } from './loop'
import { getEventPriority, EventManager, EventLayer } from './events'
import { is, dispose, calculateDpr, EquConfig } from './utils'

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

export type RenderProps<TCanvas extends Element> = Omit<StoreProps, 'gl' | 'events' | 'size'> & {
  gl?: GLProps
  events?: (store: UseStore<RootState>) => EventManager<TCanvas>
  size?: Size
  onCreated?: (state: RootState) => void
}

const createRendererInstance = <TElement extends Element>(gl: GLProps, canvas: TElement): THREE.WebGLRenderer => {
  const customRenderer = (
    typeof gl === 'function' ? gl(canvas as unknown as HTMLCanvasElement) : gl
  ) as THREE.WebGLRenderer
  if (isRenderer(customRenderer)) return customRenderer
  else
    return new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      canvas: canvas as unknown as HTMLCanvasElement,
      antialias: true,
      alpha: true,
      ...gl,
    })
}

export type ReconcilerRoot<TCanvas extends Element> = {
  configure: (config?: RenderProps<TCanvas>) => ReconcilerRoot<TCanvas>
  render: (element: React.ReactNode) => UseStore<RootState>
  unmount: () => void
}

function createRoot<TCanvas extends Element>(canvas: TCanvas): ReconcilerRoot<TCanvas> {
  // Check against mistaken use of createRoot
  let prevRoot = roots.get(canvas)
  let prevFiber = prevRoot?.fiber
  let prevStore = prevRoot?.store

  if (prevRoot) console.warn('R3F.createRoot should only be called once!')

  // Create store
  const store = prevStore || createStore(invalidate, advance)
  // Create renderer
  const fiber = prevFiber || reconciler.createContainer(store, ConcurrentRoot, false, null)
  // Map it
  if (!prevRoot) roots.set(canvas, { fiber, store })

  // Locals
  let onCreated: ((state: RootState) => void) | undefined
  let configured = false

  return {
    configure(props: RenderProps<TCanvas> = {}) {
      let {
        gl: glConfig,
        size,
        events,
        onCreated: onCreatedCallback,
        shadows = false,
        linear = false,
        flat = false,
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
      if (!is.equ(options, raycaster, shallowLoose)) applyProps(raycaster as any, { enabled: true, ...options })
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
        const handleXRFrame: THREE.XRFrameRequestCallback = (timestamp: number, frame?: THREE.XRFrame) => {
          const state = store.getState()
          if (state.frameloop === 'never') return
          advance(timestamp, true, state, frame)
        }

        // Toggle render switching on session
        const handleSessionChange = () => {
          const gl = store.getState().gl
          gl.xr.enabled = gl.xr.isPresenting
          // @ts-expect-error
          // WebXRManager's signature is incorrect.
          // See: https://github.com/pmndrs/react-three-fiber/pull/2017#discussion_r790134505
          gl.xr.setAnimationLoop(gl.xr.isPresenting ? handleXRFrame : null)
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
      const outputEncoding = linear ? THREE.LinearEncoding : THREE.sRGBEncoding
      const toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping
      if (gl.outputEncoding !== outputEncoding) gl.outputEncoding = outputEncoding
      if (gl.toneMapping !== toneMapping) gl.toneMapping = toneMapping

      // Set gl props
      if (glConfig && !is.fun(glConfig) && !isRenderer(glConfig) && !is.equ(glConfig, gl, shallowLoose))
        applyProps(gl as any, glConfig as any)
      // Store events internally
      if (events && !state.events.handlers) state.set({ events: events(store) })
      // Check pixelratio
      if (dpr && state.viewport.dpr !== calculateDpr(dpr)) state.setDpr(dpr)
      // Check size, allow it to take on container bounds initially
      size = size || { width: canvas.parentElement?.clientWidth ?? 0, height: canvas.parentElement?.clientHeight ?? 0 }
      if (!is.equ(size, state.size, shallowLoose)) state.setSize(size.width, size.height)
      // Check frameloop
      if (state.frameloop !== frameloop) state.setFrameloop(frameloop)
      // Check performance
      if (performance && !is.equ(performance, state.performance, shallowLoose))
        state.set((state) => ({ performance: { ...state.performance, ...performance } }))
      // Configure default event layer using the raycaster and onPointerMissed props
      state.set((state) => ({
        defaultEventLayer: new EventLayer(
          0,
          (self, event) => {
            const { mouse, camera, size } = state
            // https://github.com/pmndrs/react-three-fiber/pull/782
            // Events trigger outside of canvas when moved
            const customOffsets = self.computeOffsets?.(event, state)
            const offsetX = customOffsets?.offsetX ?? event.offsetX
            const offsetY = customOffsets?.offsetY ?? event.offsetY
            const width = customOffsets?.width ?? size.width
            const height = customOffsets?.height ?? size.height

            mouse.set((offsetX / width) * 2 - 1, -(offsetY / height) * 2 + 1)
            raycaster.setFromCamera(mouse, camera)

            return true
          },
          {
            raycaster,
            onPointerMissed,
          },
        ),
      }))
      state.internal.hovered.set(state.defaultEventLayer, new Map())
      state.internal.initialHits.set(state.defaultEventLayer, [])

      // Set locals
      onCreated = onCreatedCallback
      configured = true

      return this
    },
    render(element: React.ReactNode) {
      // The root has to be configured before it can be rendered
      if (!configured) this.configure()

      reconciler.updateContainer(
        <Provider store={store} element={element} onCreated={onCreated} target={canvas} />,
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
  element: React.ReactNode,
  canvas: TCanvas,
  config: RenderProps<TCanvas> = {},
): UseStore<RootState> {
  console.warn('R3F.render is no longer supported in React 18. Use createRoot instead!')
  const root = createRoot(canvas)
  root.configure(config)
  return root.render(element)
}

function Provider<TElement extends Element>({
  store,
  element,
  onCreated,
  target,
}: {
  onCreated?: (state: RootState) => void
  store: UseStore<RootState>
  element: React.ReactNode
  target: TElement
}) {
  React.useEffect(() => {
    const state = store.getState()
    // Flag the canvas active, rendering will now begin
    state.set((state) => ({ internal: { ...state.internal, active: true } }))
    // Connect events
    state.events.connect?.(target)
    // Notifiy that init is completed, the scene graph exists, but nothing has yet rendered
    if (onCreated) onCreated(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <context.Provider value={store}>{element}</context.Provider>
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

const act = (React as any).unstable_act
function createPortal(children: React.ReactNode, container: THREE.Object3D): React.ReactNode {
  return reconciler.createPortal(children, container, null, null)
}

reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: '@react-three/fiber',
  version: '18.0.0',
})

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
  act,
  roots as _roots,
}
