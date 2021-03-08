import * as THREE from 'three'
import * as React from 'react'

import { is } from 'react-three-fiber/src/core/is'
import { createRenderer, Root } from 'react-three-fiber/src/core/renderer'
import { RenderProps } from 'react-three-fiber/src/web'

import { toTree, ReactThreeTestRendererTree } from './helpers/tree'
import { toGraph, ReactThreeTestRendererSceneGraph } from './helpers/graph'

import { createStore, MockUseStoreState, context, MockScene } from './createMockStore'
import { createCanvas, CreateCanvasParameters } from './createTestCanvas'
import { createWebGLContext } from './createWebGLContext'

export type ReactThreeTestRendererOptions = CreateCanvasParameters & RenderProps

const mockRoots = new Map<any, Root>()
const { reconciler, applyProps } = createRenderer(mockRoots)

const render = <TRootNode,>(
  element: React.ReactNode,
  id: TRootNode,
  { size, concurrent, ...props }: RenderProps = { size: { width: 0, height: 0 } },
): THREE.Scene => {
  let root = mockRoots.get(id)
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
      unmount(id)
      fiber = undefined
    }
  }

  if (!fiber) {
    // If no root has been found, make one
    // @ts-ignore
    store = createStore(applyProps, () => null, {
      // @ts-ignore
      gl: new THREE.WebGLRenderer({ context: createWebGLContext(id as HTMLCanvasElement), precision: 'highp' }),
      size,
      ...props,
    })

    fiber = reconciler.createContainer(store, concurrent ? 2 : 0, false, null)
    // Map it
    mockRoots.set(id, { fiber, store })
  }

  if (store && fiber) {
    reconciler.updateContainer(<Provider store={store} element={element} />, fiber, null, () => undefined)
    return store!.getState().scene as THREE.Scene
  } else {
    throw 'R3F: Error creating fiber-root!'
  }
}

function Provider({ store, element }: { store: MockUseStoreState; element: React.ReactNode }) {
  React.useEffect(() => store.getState().set((state) => ({ internal: { ...state.internal, active: true } })), [])
  return <context.Provider value={store}>{element}</context.Provider>
}

const unmount = <TRootNode,>(id: TRootNode) => {
  const root = mockRoots.get(id)
  const fiber = root?.fiber

  const dispose = (obj: any) => {
    if (obj.dispose && obj.type !== 'Scene') obj.dispose()
    for (const p in obj) {
      if (typeof p === 'object' && (p as any).dispose) (p as any).dispose()
      delete obj[p]
    }
  }

  if (fiber) {
    reconciler.updateContainer(null, fiber, null, () => {
      const state = root?.store.getState()
      if (state) {
        dispose(state.raycaster)
        dispose(state.camera)
        dispose(state)
      }
      mockRoots.delete(id)
    })
  }
}

reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: 'react-three-test-renderer',
  // @ts-expect-error it's a babel macro
  version: typeof R3F_VERSION !== 'undefined' ? R3F_VERSION : '0.0.0',
})

export type ThreeTestRenderer = {
  scene: MockScene
  unmount: <TRootNode>(id: TRootNode) => void
  update: (el: React.ReactNode) => void
  toTree: () => ReactThreeTestRendererTree | undefined
  toGraph: () => ReactThreeTestRendererSceneGraph | undefined
}

const create = (element: React.ReactNode, options?: ReactThreeTestRendererOptions): ThreeTestRenderer => {
  const canvas = createCanvas({
    width: options?.width,
    height: options?.height,
  })
  const scene = render(element, canvas, options) as MockScene

  return {
    scene,
    unmount,
    update(newElement: React.ReactNode) {
      const fiber = mockRoots.get(canvas)?.fiber
      if (fiber) {
        reconciler.updateContainer(newElement, fiber, null, () => null)
      }
      return
    },
    toTree: () => {
      if (!scene) {
        return
      } else {
        return toTree(scene as MockScene)
      }
    },
    toGraph: () => {
      if (!scene) {
        return
      } else {
        return toGraph(scene as MockScene)
      }
    },
  }
}

const ReactThreeTestRenderer = {
  create,
  act: reconciler.act,
}

export default ReactThreeTestRenderer
