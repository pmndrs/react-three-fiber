/* eslint-disable import/named */
/* eslint-disable import/namespace */
import { THREE, Renderer as NativeRenderer } from 'expo-three'
import * as React from 'react'
import { RootTag } from 'react-reconciler'
import { UseStore } from 'zustand'

import { is } from '../core/is'
import { createStore, StoreProps, isRenderer, context, RootState, Size } from '../core/store'
import { createRenderer, extend, prepare, Root } from '../core/renderer'
import { createLoop, addEffect, addAfterEffect, addTail } from '../core/loop'
import { createPointerEvents as events } from './events'
import { Canvas } from './Canvas'
import { EventManager } from '../core/events'
import { PixelRatio, View } from 'react-native'
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl'

/*
 This here is a singleton instance that keeps track of the fiber 
 root and the zustand stores in association with each "canvas".

 The web code uses "Element" as keys.
 For react native we don't have that so I'll try refs as keys
 */
const roots = new Map<HTMLCanvasElement, Root>()
const modes = ['legacy', 'blocking', 'concurrent'] as const
const { invalidate, advance } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots)

export type RenderProps<TCanvas extends HTMLCanvasElement> = Omit<StoreProps, 'gl' | 'events' | 'size'> & {
  gl: WebGLRenderingContext & ExpoWebGLRenderingContext
  events?: (store: UseStore<RootState>) => EventManager<TCanvas>
  size?: Size
  mode?: typeof modes[number]
  onCreated?: (state: RootState) => void
}

const createRendererInstance = (
  gl: ExpoWebGLRenderingContext & WebGLRenderingContext,
  canvas: HTMLCanvasElement,
): THREE.WebGLRenderer => {
  const pixelRatio = PixelRatio.get()
  const renderer = new NativeRenderer({
    powerPreference: 'high-performance',
    canvas,
    antialias: true,
    alpha: true,
    pixelRatio,
    gl: gl,
  })

  const rendererRender = renderer.render.bind(renderer)
  renderer.render = (scene, camera) => {
    rendererRender(scene, camera)
    // End frame through the RN Bridge
    gl.endFrameEXP()
  }

  return renderer
}

function render<TCanvas extends HTMLCanvasElement>(
  element: React.ReactNode,
  canvas: TCanvas,
  { gl, size, mode = modes[1], events, onCreated, ...props }: RenderProps<HTMLCanvasElement>,
): UseStore<RootState> {
  // Allow size to take on container bounds initially
  if (!size) {
    size = {
      width: 0,
      height: 0,
    }
  }

  let root = roots.get(canvas)
  let fiber = root?.fiber
  let store = root?.store
  let state = store?.getState()

  if (fiber && state) {
    const lastProps = state.internal.lastProps

    // When a root was found, see if any fundamental props must be changed or exchanged

    // Check pixelratio
    if (props.dpr !== undefined && !is.equ(lastProps.dpr, props.dpr)) state.setDpr(props.dpr)
    // Check size
    if (size !== undefined && !is.equ(lastProps.size, size)) state.setSize(size.width, size.height)

    // For some props we want to reset the entire root

    // Changes to the color-space
    const linearChanged = props.linear !== lastProps.linear
    if (linearChanged) {
      unmountComponentAtNode(canvas)
      fiber = undefined
    }
  }

  if (!fiber) {
    // If no root has been found, make one

    // Create gl
    const glRenderer = createRendererInstance(gl, canvas)

    // Enable VR if requested
    if (props.vr) {
      glRenderer.xr.enabled = true
      glRenderer.setAnimationLoop((timestamp) => advance(timestamp, true))
    }

    // Create store
    // Understanding : createStore in v6 does quite a lot of things
    // It creates a THREE.Scene inside it and maintains descriptors and whatnot all inside of it.
    // So we add nodes as children to it, all children have small descriptors attached and such.
    store = createStore(applyProps, invalidate, advance, { gl: glRenderer, size, ...props })

    const state = store.getState()
    const get = state.get
    // Create renderer
    fiber = reconciler.createContainer(store, modes.indexOf(mode) as RootTag, false, null)
    console.log('added to roots', canvas)
    // Map it
    roots.set(canvas, { fiber, store })
    // Store events internally
    if (events) state.set({ events: events(store) })
  }

  if (store && fiber) {
    reconciler.updateContainer(
      <Provider store={store} element={element} onCreated={onCreated} target={canvas} />,
      fiber,
      null,
      () => undefined,
    )
    return store
  } else {
    throw 'Error creating root!'
  }
}

function Provider<TElement extends HTMLCanvasElement>({
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

function unmountComponentAtNode<TElement extends HTMLCanvasElement>(
  canvas: TElement,
  callback?: (canvas: TElement) => void,
) {
  const root = roots.get(canvas)
  const fiber = root?.fiber
  if (fiber) {
    const state = root?.store.getState()
    if (state) state.internal.active = false
    reconciler.updateContainer(null, fiber, null, () => {
      if (state) {
        setTimeout(() => {
          state.events.disconnect?.()
          state.gl?.renderLists?.dispose?.()
          state.gl?.forceContextLoss?.()
          dispose(state)
          console.log('removed from roots', canvas)
          roots.delete(canvas)
          if (callback) callback(canvas)
        }, 500)
      }
    })
  }
}

function dispose<TObj extends { dispose?: () => void; type?: string; [key: string]: any }>(obj: TObj) {
  if (obj.dispose && obj.type !== 'Scene') obj.dispose()
  for (const p in obj) {
    ;(p as any).dispose?.()
    delete obj[p]
  }
}

const act = reconciler.act
const hasSymbol = is.fun(Symbol) && Symbol.for
const REACT_PORTAL_TYPE = hasSymbol ? Symbol.for('react.portal') : 0xeaca
function createPortal(
  children: React.ReactNode,
  container: THREE.Object3D,
  implementation?: any,
  key: any = null,
): React.ReactNode {
  return {
    $$typeof: REACT_PORTAL_TYPE,
    key: key == null ? null : '' + key,
    children,
    containerInfo: prepare(container),
    implementation,
  }
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
