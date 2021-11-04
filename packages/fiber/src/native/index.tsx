import * as THREE from 'three'
import * as React from 'react'
// @ts-ignore
import { ConcurrentRoot } from 'react-reconciler/constants'
import { UseStore } from 'zustand'

import { dispose } from '../core/utils'
import { Renderer, isRenderer, createStore, StoreProps, context, RootState, Size } from '../core/store'
import { createRenderer, extend, Root } from '../core/renderer'
import { createLoop, addEffect, addAfterEffect, addTail } from '../core/loop'
import { createTouchEvents as events, getEventPriority } from './events'
import { Canvas } from './Canvas'
import { EventManager } from '../core/events'
import { View, PixelRatio } from 'react-native'
import { ExpoWebGLRenderingContext } from 'expo-gl'

export type GLContext = ExpoWebGLRenderingContext | WebGLRenderingContext

type Properties<T> = Pick<T, { [K in keyof T]: T[K] extends (_: any) => any ? never : K }[keyof T]>

type GLProps =
  | Renderer
  | ((canvas: HTMLCanvasElement, context: GLContext) => Renderer)
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>
  | undefined

const roots = new Map<GLContext, Root>()
const { invalidate, advance } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots, getEventPriority)

export type RenderProps<TView extends View> = Omit<StoreProps, 'gl' | 'events' | 'size' | 'dpr'> & {
  gl?: GLProps
  events?: (store: UseStore<RootState>) => EventManager<TView>
  size?: Size
  onCreated?: (state: RootState) => void
}

const createRendererInstance = (gl: GLProps, context: GLContext): THREE.WebGLRenderer => {
  // Create canvas shim
  const canvas = {
    width: context.drawingBufferWidth,
    height: context.drawingBufferHeight,
    style: {},
    addEventListener: (() => {}) as any,
    removeEventListener: (() => {}) as any,
    clientHeight: context.drawingBufferHeight,
  } as HTMLCanvasElement

  // If a renderer is specified, return it
  const customRenderer = (typeof gl === 'function' ? gl(canvas, context) : gl) as THREE.WebGLRenderer
  if (isRenderer(customRenderer)) return customRenderer

  // Create renderer and pass our canvas and its context
  const renderer = new THREE.WebGLRenderer({
    powerPreference: 'high-performance',
    antialias: true,
    alpha: true,
    ...(gl as any),
    canvas,
    context,
  })

  // Set color management
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  // Set GL props
  if (gl) applyProps(renderer as any, gl as any)

  // Bind render to RN bridge
  if ((context as ExpoWebGLRenderingContext).endFrameEXP) {
    const renderFrame = renderer.render.bind(renderer)
    renderer.render = (scene: THREE.Scene, camera: THREE.Camera) => {
      renderFrame(scene, camera)
      ;(context as ExpoWebGLRenderingContext).endFrameEXP()
    }
  }

  return renderer
}

function createRoot<TView extends View>(context: GLContext, config?: RenderProps<TView>) {
  return {
    render: (element: React.ReactNode) => render(element, context, config),
    unmount: () => unmountComponentAtNode(context),
  }
}

function render<TView extends View>(
  element: React.ReactNode,
  context: GLContext,
  { gl, size = { width: 0, height: 0 }, events, onCreated, ...props }: RenderProps<TView> = {},
): UseStore<RootState> {
  let root = roots.get(context)
  let fiber = root?.fiber
  let store = root?.store
  let state = store?.getState()

  if (fiber && state) {
    // When a root was found, see if any fundamental props must be changed or exchanged

    // Check size
    if (state.size.width !== size.width || state.size.height !== size.height) state.setSize(size.width, size.height)

    // For some props we want to reset the entire root

    // Changes to the color-space
    const linearChanged = props.linear !== state.internal.lastProps.linear
    if (linearChanged) {
      unmountComponentAtNode(context)
      fiber = undefined
    }
  }

  if (!fiber) {
    // If no root has been found, make one

    // Create gl
    const glRenderer = createRendererInstance(gl, context)

    // Create store
    store = createStore(applyProps, invalidate, advance, {
      gl: glRenderer,
      size,
      ...props,
      // expo-gl can only render at native dpr/resolution
      // https://github.com/expo/expo-three/issues/39
      dpr: PixelRatio.get(),
    })
    const state = store.getState()
    // Create renderer
    fiber = reconciler.createContainer(store, ConcurrentRoot, false, null)
    // Map it
    roots.set(context, { fiber, store })
    // Store event manager internally and connect it
    if (events) {
      state.set({ events: events(store) })
      state.get().events.connect?.(context)
    }
  }

  if (store && fiber) {
    reconciler.updateContainer(
      <Provider store={store} element={element} onCreated={onCreated} />,
      fiber,
      null,
      () => undefined,
    )
    return store
  } else {
    throw 'Error creating root!'
  }
}

function Provider({
  store,
  element,
  onCreated,
}: {
  onCreated?: (state: RootState) => void
  store: UseStore<RootState>
  element: React.ReactNode
}) {
  React.useEffect(() => {
    const state = store.getState()
    // Flag the canvas active, rendering will now begin
    state.set((state) => ({ internal: { ...state.internal, active: true } }))
    // Notifiy that init is completed, the scene graph exists, but nothing has yet rendered
    if (onCreated) onCreated(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <context.Provider value={store}>{element}</context.Provider>
}

function unmountComponentAtNode(context: GLContext, callback?: (context: GLContext) => void) {
  const root = roots.get(context)
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
            dispose(state)
            roots.delete(context)
            if (callback) callback(context)
          } catch (e) {
            /* ... */
          }
        }, 500)
      }
    })
  }
}

const act = reconciler.act
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
  events,
  reconciler,
  applyProps,
  dispose,
  invalidate,
  advance,
  extend,
  addEffect,
  addAfterEffect,
  addTail,
  Canvas,
  act,
  roots as _roots,
}
