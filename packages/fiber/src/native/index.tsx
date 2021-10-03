import { THREE, Renderer as NativeRenderer } from 'expo-three'
import * as React from 'react'
// @ts-ignore
import { ConcurrentRoot } from 'react-reconciler/constants'
import { UseStore } from 'zustand'

import { is, dispose } from '../core/utils'
import { createStore, StoreProps, context, RootState, Size } from '../core/store'
import { createRenderer, extend, Root } from '../core/renderer'
import { createLoop, addEffect, addAfterEffect, addTail } from '../core/loop'
import { createTouchEvents as events, getEventPriority } from './events'
import { Canvas } from './Canvas'
import { EventManager } from '../core/events'
import { PixelRatio, View } from 'react-native'
import { ExpoWebGLRenderingContext } from 'expo-gl'

const roots = new Map<View, Root>()
const { invalidate, advance } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots, getEventPriority)

export type RenderProps<TCanvas extends View> = Omit<StoreProps, 'gl' | 'events' | 'size'> & {
  gl?: WebGLRenderingContext & ExpoWebGLRenderingContext
  events?: (store: UseStore<RootState>) => EventManager<TCanvas>
  size?: Size
  onCreated?: (state: RootState) => void
}

const createRendererInstance = <TElement extends View>(
  gl: ExpoWebGLRenderingContext & WebGLRenderingContext,
): THREE.WebGLRenderer => {
  const pixelRatio = PixelRatio.get()
  const renderer = new NativeRenderer({
    powerPreference: 'high-performance',
    antialias: true,
    alpha: true,
    pixelRatio,
    gl,
  })

  const renderFrame = renderer.render.bind(renderer)
  renderer.render = (scene: THREE.Scene, camera: THREE.Camera) => {
    renderFrame(scene, camera)
    // End frame through the RN Bridge
    gl.endFrameEXP()
  }

  return renderer
}

function createRoot<TCanvas extends View>(target: View) {
  return {
    render: (element: React.ReactNode) => render(element, target),
    unmount: () => unmountComponentAtNode(target),
  }
}

function render<TCanvas extends View>(
  element: React.ReactNode,
  target: TCanvas,
  {
    dpr = PixelRatio.get(),
    gl,
    size = { width: 0, height: 0 },
    events,
    onCreated,
    ...props
  }: RenderProps<TCanvas> = {},
): UseStore<RootState> {
  // Set initial size to drawing buffer dimensions
  if (!size) {
    size = {
      width: gl?.drawingBufferWidth ?? 0,
      height: gl?.drawingBufferHeight ?? 0,
    }
  }

  let root = roots.get(target)
  let fiber = root?.fiber
  let store = root?.store
  let state = store?.getState()

  if (fiber && state) {
    const lastProps = state.internal.lastProps

    // When a root was found, see if any fundamental props must be changed or exchanged

    // Check pixelratio
    if (dpr !== undefined && !is.equ(lastProps.dpr, dpr)) state.setDpr(dpr)
    // Check size
    if (!is.equ(lastProps.size, size)) state.setSize(size.width, size.height)

    // For some props we want to reset the entire root

    // Changes to the color-space
    const linearChanged = props.linear !== lastProps.linear
    if (linearChanged) {
      unmountComponentAtNode(target)
      fiber = undefined
    }
  }

  if (!fiber) {
    // If no root has been found, make one

    // Create gl
    const glRenderer = createRendererInstance(gl as any)

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
    roots.set(target, { fiber, store })
    // Store events internally
    if (events) state.set({ events: events(store) })
  }

  if (store && fiber) {
    reconciler.updateContainer(
      <Provider store={store} element={element} onCreated={onCreated} target={target} />,
      fiber,
      null,
      () => undefined,
    )
    return store
  } else {
    throw 'Error creating root!'
  }
}

function Provider<TElement extends View>({
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
  }, [])
  return <context.Provider value={store}>{element}</context.Provider>
}

function unmountComponentAtNode<TElement extends View>(target: TElement, callback?: (target: TElement) => void) {
  const root = roots.get(target)
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
            roots.delete(target)
            if (callback) callback(target)
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
