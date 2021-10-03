import * as THREE from 'three'
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

const roots = new Map<View, Root>()
const { invalidate, advance } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots, getEventPriority)

export type RenderProps<TView extends View> = Omit<StoreProps, 'gl' | 'events' | 'size'> & {
  gl?: THREE.WebGLRenderer
  events?: (store: UseStore<RootState>) => EventManager<TView>
  size?: Size
  onCreated?: (state: RootState) => void
}

function createRoot<TView extends View>(target: TView) {
  return {
    render: (element: React.ReactNode) => render(element, target),
    unmount: () => unmountComponentAtNode(target),
  }
}

function render<TView extends View>(
  element: React.ReactNode,
  target: TView,
  { dpr = PixelRatio.get(), gl, size = { width: 0, height: 0 }, events, onCreated, ...props }: RenderProps<TView> = {},
): UseStore<RootState> {
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

    // Throw an error if a renderer isn't specified
    if (!gl) throw 'An instance of THREE.WebGLRenderer must be specified via gl!'

    // Create store
    store = createStore(applyProps, invalidate, advance, {
      gl,
      dpr,
      size,
      ...props,
    })
    const state = store.getState()
    // Create renderer
    fiber = reconciler.createContainer(store, ConcurrentRoot, false, null)
    // Map it
    roots.set(target, { fiber, store })
    // Store event manager internally and connect it
    if (events) {
      state.set({ events: events(store) })
      state.get().events.connect?.(target)
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

function Provider<TView extends View>({
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
  }, [])
  return <context.Provider value={store}>{element}</context.Provider>
}

function unmountComponentAtNode<TView extends View>(target: TView, callback?: (target: TView) => void) {
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
