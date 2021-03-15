import * as THREE from 'three'
import * as React from 'react'
import { RootTag } from 'react-reconciler'
import { UseStore } from 'zustand'

import { is } from '../core/is'
import { createStore, StoreProps, isRenderer, context, RootState, Size } from '../core/store'
import { createRenderer, extend, Instance, Root } from '../core/renderer'
import { createLoop, addEffect, addAfterEffect, addTail } from '../core/loop'
import { createDOMEvents as events } from './events'
import { Canvas } from './Canvas'
import { EventManager } from '../core/events'

export type RenderProps<TCanvas extends Element> = Omit<StoreProps, 'gl' | 'events' | 'size'> & {
  gl?: THREE.WebGLRenderer | THREE.WebGLRendererParameters
  events?: (store: UseStore<RootState>) => EventManager<TCanvas>
  size?: Size
  mode?: 'legacy' | 'blocking' | 'concurrent'
  onCreated?: (state: RootState) => void
}

const roots = new Map<Element, Root>()
const modes = ['legacy', 'blocking', 'concurrent']
const { invalidate, advance } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots)

const createRendererInstance = <TElement extends Element>(
  gl: THREE.WebGLRenderer | THREE.WebGLRendererParameters | undefined,
  canvas: TElement,
): THREE.WebGLRenderer =>
  isRenderer(gl as THREE.WebGLRenderer)
    ? (gl as THREE.WebGLRenderer)
    : new THREE.WebGLRenderer({
        powerPreference: 'high-performance',
        canvas: (canvas as unknown) as HTMLCanvasElement,
        antialias: true,
        alpha: true,
        ...gl,
      })

function render<TCanvas extends Element>(
  element: React.ReactNode,
  canvas: TCanvas,
  { gl, size = { width: 0, height: 0 }, mode = 'blocking', events, onCreated, ...props }: RenderProps<TCanvas> = {},
): UseStore<RootState> {
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
    // Create store
    store = createStore(applyProps, invalidate, advance, { gl: createRendererInstance(gl, canvas), size, ...props })
    const state = store.getState()
    const get = state.get
    // Create renderer
    fiber = reconciler.createContainer(store, modes.indexOf(mode) as RootTag, false, null)
    // Map it
    roots.set(canvas, { fiber, store })
    // Create and register events

    // Store events internally
    if (events) state.set({ events: events(store) })

    // VR
    if (props.vr && (gl as THREE.WebGLRenderer).xr && (gl as THREE.WebGLRenderer).setAnimationLoop) {
      ;(gl as THREE.WebGLRenderer).xr.enabled = true
      ;(gl as THREE.WebGLRenderer).setAnimationLoop((t: number) => advance(t, true, state))
    }
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
    throw 'R3F: Error creating fiber-root!'
  }
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
  }, [])
  return <context.Provider value={store}>{element}</context.Provider>
}

function unmountComponentAtNode<TElement extends Element>(canvas: TElement, callback?: (canvas: TElement) => void) {
  const root = roots.get(canvas)
  const fiber = root?.fiber
  if (fiber) {
    reconciler.updateContainer(null, fiber, null, () => {
      const state = root?.store.getState()
      if (state) {
        state.events.disconnect?.()
        state.gl?.renderLists?.dispose()
        state.gl?.forceContextLoss()
        dispose((state.gl as unknown) as Instance)
        dispose((state.raycaster as unknown) as Instance)
        dispose((state.camera as unknown) as Instance)
        dispose((state as unknown) as Instance)
      }
      roots.delete(canvas)
      if (callback) callback(canvas)
    })
  }
}

function dispose(obj: Instance) {
  if (obj.dispose && obj.type !== 'Scene') obj.dispose()
  for (const p in obj) {
    if (typeof p === 'object' && (p as Instance).dispose) (p as Instance).dispose()
    delete obj[p]
  }
}

const act = reconciler.act
const hasSymbol = is.fun(Symbol) && Symbol.for
const REACT_PORTAL_TYPE = hasSymbol ? Symbol.for('react.portal') : 0xeaca
function createPortal(children: React.ReactNode, container: any, impl?: any, key: any = null): React.ReactNode {
  if (!container.__objects) container.__objects = []
  return { $$typeof: REACT_PORTAL_TYPE, key: key == null ? null : '' + key, children, container, impl }
}

reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: 'react-three-fiber',
  // @ts-ignore
  version: typeof R3F_VERSION !== 'undefined' ? R3F_VERSION : '0.0.0',
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
  invalidate,
  advance,
  extend,
  addEffect,
  addAfterEffect,
  addTail,
  Canvas,
  act,
}
