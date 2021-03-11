import * as THREE from 'three'
import * as React from 'react'
import { RootTag } from 'react-reconciler'
import { UseStore } from 'zustand'

import { is } from '../core/is'
import { createStore, StoreProps, isRenderer, context, RootState, Events, Size } from '../core/store'
import { createRenderer, extend, Root } from '../core/renderer'
import { createLoop, addEffect, addAfterEffect, addTail } from '../core/loop'
import { createEvents as events } from './events'
import { Canvas } from './Canvas'

export type RenderProps = Omit<StoreProps, 'gl' | 'events' | 'size'> & {
  gl?: THREE.WebGLRenderer | THREE.WebGLRendererParameters
  events?: (store: UseStore<RootState>) => Events
  size?: Size
  mode?: 'legacy' | 'blocking' | 'concurrent'
}

const roots = new Map<HTMLCanvasElement, Root>()
const modes = ['legacy', 'blocking', 'concurrent']
const { invalidate, advance } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots)

const createRendererInstance = (
  gl: THREE.WebGLRenderer | THREE.WebGLRendererParameters | undefined,
  canvas: HTMLCanvasElement,
): THREE.WebGLRenderer =>
  isRenderer(gl as THREE.WebGLRenderer)
    ? (gl as THREE.WebGLRenderer)
    : new THREE.WebGLRenderer({ powerPreference: 'high-performance', canvas, antialias: true, alpha: true, ...gl })

function render(
  element: React.ReactNode,
  canvas: HTMLCanvasElement,
  { gl, size = { width: 0, height: 0 }, mode = 'blocking', events, ...props }: RenderProps = {},
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
    // Create renderer
    fiber = reconciler.createContainer(store, modes.indexOf(mode) as RootTag, false, null)
    // Map it
    roots.set(canvas, { fiber, store })
    // Create and register events

    if (events) {
      const handlers = events(store)
      const manager = {
        handlers,
        connect(target: HTMLCanvasElement) {
          Object.entries(handlers).forEach(([name, event]) => target.addEventListener(name, event, { passive: true }))
        },
        disconnect(target: HTMLCanvasElement) {
          Object.entries(handlers).forEach(([name, event]) => target.removeEventListener(name, event))
        },
      }
      // Store events internally
      state.set((state) => ({ internal: { ...state.internal, events: manager } }))
      // Connect them
      manager.connect(canvas)
    }

    // VR
    if (props.vr && (gl as THREE.WebGLRenderer).xr && (gl as THREE.WebGLRenderer).setAnimationLoop) {
      ;(gl as THREE.WebGLRenderer).xr.enabled = true
      ;(gl as THREE.WebGLRenderer).setAnimationLoop((t: number) => advance(t, true, state))
    }
  }

  if (store && fiber) {
    reconciler.updateContainer(<Provider store={store} element={element} />, fiber, null, () => undefined)
    return store
  } else {
    throw 'R3F: Error creating fiber-root!'
  }
}

function Provider({ store, element }: { store: UseStore<RootState>; element: React.ReactNode }) {
  React.useEffect(() => store.getState().set((state) => ({ internal: { ...state.internal, active: true } })), [])
  return <context.Provider value={store}>{element}</context.Provider>
}

function unmountComponentAtNode(canvas: HTMLCanvasElement, callback?: (canvas: HTMLCanvasElement) => void) {
  const root = roots.get(canvas)
  const fiber = root?.fiber
  if (fiber) {
    reconciler.updateContainer(null, fiber, null, () => {
      const state = root?.store.getState()
      if (state) {
        state.internal.events?.disconnect(canvas)
        state.gl?.renderLists?.dispose()
        state.gl?.forceContextLoss()
        dispose(state.gl)
        dispose(state.raycaster)
        dispose(state.camera)
        dispose(state)
      }
      roots.delete(canvas)
      if (callback) callback(canvas)
    })
  }
}

function dispose(obj: any) {
  if (obj.dispose && obj.type !== 'Scene') obj.dispose()
  for (const p in obj) {
    if (typeof p === 'object' && (p as any).dispose) (p as any).dispose()
    delete obj[p]
  }
}

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

const testutil_act = reconciler.act

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
  testutil_act,
}
