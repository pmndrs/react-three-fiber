import * as THREE from 'three'
import * as React from 'react'
// @ts-ignore
import { ConcurrentRoot } from 'react-reconciler/constants'
import { UseStore } from 'zustand'

import { dispose, calculateDpr } from '../core/utils'
import { isRenderer, createStore, StoreProps, context, RootState, Size } from '../core/store'
import { createRenderer, extend, Root } from '../core/renderer'
import { createLoop, addEffect, addAfterEffect, addTail } from '../core/loop'
import { createTouchEvents as events, getEventPriority } from './events'
import { Canvas } from './Canvas'
import { EventManager } from '../core/events'
import { View, PixelRatio } from 'react-native'
import { ExpoWebGLRenderingContext } from 'expo-gl'

export type Context = ExpoWebGLRenderingContext | WebGLRenderingContext

const roots = new Map<Context, Root>()
const { invalidate, advance } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots, getEventPriority)

export type RenderProps<TView extends View> = Omit<StoreProps, 'gl' | 'events' | 'size'> & {
  gl?: THREE.WebGLRenderer | Partial<THREE.WebGLRendererParameters>
  events?: (store: UseStore<RootState>) => EventManager<TView>
  size?: Size
  onCreated?: (state: RootState) => void
}

const createRendererInstance = (
  gl: THREE.WebGLRenderer | Partial<THREE.WebGLRendererParameters> | undefined,
  context: Context,
): THREE.WebGLRenderer => {
  // If a renderer is specified, return it
  if (isRenderer(gl as THREE.WebGLRenderer)) return gl as THREE.WebGLRenderer

  // Create canvas shim
  const canvas = {
    width: context.drawingBufferWidth,
    height: context.drawingBufferHeight,
    style: {},
    addEventListener: (() => {}) as any,
    removeEventListener: (() => {}) as any,
    clientHeight: context.drawingBufferHeight,
  } as HTMLCanvasElement

  // Create renderer and pass our canvas and its context
  const renderer = new THREE.WebGLRenderer({
    powerPreference: 'high-performance',
    antialias: true,
    alpha: true,
    ...(gl as any),
    canvas,
    context,
  })

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

function createRoot(context: Context) {
  return {
    render: (element: React.ReactNode) => render(element, context),
    unmount: () => unmountComponentAtNode(context),
  }
}

function render<TView extends View>(
  element: React.ReactNode,
  context: Context,
  { dpr = PixelRatio.get(), gl, size = { width: 0, height: 0 }, events, onCreated, ...props }: RenderProps<TView> = {},
): UseStore<RootState> {
  let root = roots.get(context)
  let fiber = root?.fiber
  let store = root?.store
  let state = store?.getState()

  if (fiber && state) {
    // When a root was found, see if any fundamental props must be changed or exchanged

    // Check pixelratio
    if (dpr !== undefined && state.viewport.dpr !== calculateDpr(dpr)) state.setDpr(dpr)
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
      dpr,
      size,
      ...props,
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

function unmountComponentAtNode(context: Context, callback?: (context: Context) => void) {
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
  version: '17.0.2',
})

export * from '../core/hooks'
export {
  context,
  render,
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
