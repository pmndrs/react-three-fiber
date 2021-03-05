import * as THREE from 'three'
import * as React from 'react'
import { name as rendererPackageName, version } from '../../package.json'
import { createStore, StoreProps, isRenderer } from '../core/store'
import { createRenderer, Root } from '../core/renderer'
import { createLoop } from '../core/loop'
import { is } from '../core/is'
import { Canvas } from './Canvas'

type RenderProps = Omit<StoreProps, 'gl'> & {
  gl?: THREE.WebGLRenderer | THREE.WebGLRendererParameters
  concurrent?: boolean
}

const roots = new Map<HTMLCanvasElement, Root>()
const { invalidate } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots, invalidate)

const createRendererInstance = (
  gl: THREE.WebGLRenderer | THREE.WebGLRendererParameters | undefined,
  canvas: HTMLCanvasElement
) =>
  isRenderer(gl as THREE.WebGLRenderer)
    ? (gl as THREE.WebGLRenderer)
    : new THREE.WebGLRenderer({ powerPreference: 'high-performance', canvas, antialias: true, alpha: true, ...gl })

function render(element: React.ReactNode, canvas: HTMLCanvasElement, { gl, size, concurrent, ...props }: RenderProps) {
  let root = roots.get(canvas)
  let store = root?.store.getState()
  let fiber = root?.fiber

  if (fiber && store) {
    const lastProps = store.internal.lastProps

    // When a root was found, see if any fundamental props must be changed or exchanged

    // Check pixelratio
    if (props.pixelRatio !== undefined && !is.equ(lastProps.pixelRatio, props.pixelRatio))
      store.setPixelRatio(props.pixelRatio)
    // Check size
    if (size !== undefined && !is.equ(lastProps.size, size)) store.setSize(size.width, size.height)

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
    const store = createStore({ gl: createRendererInstance(gl, canvas), size, ...props })
    fiber = reconciler.createContainer(store, concurrent ? 2 : 0, false, null)
    // Map it
    roots.set(canvas, { fiber, store })
    // Kick off render loop
    invalidate(store.getState())
  }

  reconciler.updateContainer(element, fiber, null, () => undefined)
  return reconciler.getPublicRootInstance(fiber)
}

function unmountComponentAtNode(canvas: HTMLCanvasElement, callback?: (canvas: HTMLCanvasElement) => void) {
  const root = roots.get(canvas)
  const fiber = root?.fiber
  if (fiber) {
    reconciler.updateContainer(null, fiber, null, () => {
      roots.delete(canvas)
      if (callback) callback(canvas)
    })
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
  rendererPackageName,
  version,
})

export { render, unmountComponentAtNode, createPortal, reconciler, applyProps, Canvas }
