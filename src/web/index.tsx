import * as THREE from 'three'
import * as React from 'react'
import { is } from '../core/is'
import { createStore, StoreProps, isRenderer, context, RootState } from '../core/store'
import { createRenderer, extend, Root } from '../core/renderer'
import { createLoop } from '../core/loop'
import { createEvents } from './events'
import { Canvas } from './Canvas'
import { UseStore } from 'zustand'

type RenderProps = Omit<StoreProps, 'gl' | 'context'> & {
  gl?: THREE.WebGLRenderer | THREE.WebGLRendererParameters
  concurrent?: boolean
}

const roots = new Map<HTMLCanvasElement, Root>()
const { invalidate } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots, invalidate)

const createRendererInstance = (
  gl: THREE.WebGLRenderer | THREE.WebGLRendererParameters | undefined,
  canvas: HTMLCanvasElement,
) =>
  isRenderer(gl as THREE.WebGLRenderer)
    ? (gl as THREE.WebGLRenderer)
    : new THREE.WebGLRenderer({ powerPreference: 'high-performance', canvas, antialias: true, alpha: true, ...gl })

function render(element: React.ReactNode, canvas: HTMLCanvasElement, { gl, size, concurrent, ...props }: RenderProps): UseStore<RootState> {
  let root = roots.get(canvas)
  let fiber = root?.fiber
  let store = root?.store
  let state = store?.getState()

  if (fiber && state) {
    const lastProps = state.internal.lastProps

    // When a root was found, see if any fundamental props must be changed or exchanged

    // Check pixelratio
    if (props.pixelRatio !== undefined && !is.equ(lastProps.pixelRatio, props.pixelRatio))
      state.setPixelRatio(props.pixelRatio)
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
    store = createStore(applyProps, invalidate, { gl: createRendererInstance(gl, canvas), size, ...props })
    const state = store.getState()
    // Create and register events
    const events = createEvents(store)
    Object.entries(events).forEach(([name, event]) => canvas.addEventListener(name, event, { passive: true }))
    state.set((state) => ({ internal: { ...state.internal, events } }))

    // Create renderer
    fiber = reconciler.createContainer(store, concurrent ? 2 : 0, false, null)
    // Map it
    roots.set(canvas, { fiber, store })
    // Kick off render loop
    state.invalidate()
  }

  if (store && fiber) {
    reconciler.updateContainer(<context.Provider value={store} children={element} />, fiber, null, () => undefined)
    return store
  } else {
    throw 'R3F: Error creating fiber-root!'
  }
}

function unmountComponentAtNode(canvas: HTMLCanvasElement, callback?: (canvas: HTMLCanvasElement) => void) {
  const root = roots.get(canvas)
  const fiber = root?.fiber
  if (fiber) {
    reconciler.updateContainer(null, fiber, null, () => {
      const state = root?.store.getState()
      if (state) {
        Object.entries(state.internal.events).forEach(([name, event]) => canvas.removeEventListener(name, event))
        if (state.gl.renderLists) state.gl.renderLists.dispose()
        if (state.gl.forceContextLoss) state.gl.forceContextLoss()
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

export * from '../core/hooks'
export { context, render, unmountComponentAtNode, createPortal, reconciler, applyProps, invalidate, extend, Canvas }
