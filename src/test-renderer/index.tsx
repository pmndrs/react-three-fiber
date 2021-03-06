import * as THREE from 'three'
import * as React from 'react'

import { version } from '../../package.json'

import { is } from '../core/is'
import { createRenderer, Root } from '../core/renderer'

import { createMockStore, MockStoreProps, MockUseStoreState, context } from './createMockStore'
import { createCanvas, CreateCanvasParameters } from './createTestCanvas'

type RenderProps = Omit<MockStoreProps, 'gl' | 'context'> & {
  gl?: THREE.WebGLRenderer | THREE.WebGLRendererParameters
  concurrent?: boolean
}

type MockRoot = Omit<Root, 'store'> & {
  store: MockUseStoreState
}

export interface ReactThreeTestRendereOptions extends CreateCanvasParameters {}

const mockRoots = new Map<any, MockRoot>()
const { reconciler, applyProps } = createRenderer(mockRoots, () => null)

const render = <TRootNode,>(
  element: React.ReactNode,
  id: TRootNode,
  { gl, size, concurrent, ...props }: RenderProps = { size: { width: 0, height: 0 } }
): THREE.Scene => {
  let root = mockRoots.get(id)
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
      unmount(id)
      fiber = undefined
    }
  }

  if (!fiber) {
    // If no root has been found, make one
    store = createMockStore(applyProps, { gl: {}, size, ...props })

    fiber = reconciler.createContainer(store, concurrent ? 2 : 0, false, null)
    // Map it
    mockRoots.set(id, { fiber, store })
  }

  if (store && fiber) {
    reconciler.updateContainer(<context.Provider value={store} children={element} />, fiber, null, () => undefined)
    return store!.getState().scene as THREE.Scene
  } else {
    throw 'R3F: Error creating fiber-root!'
  }
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

const toTree = (scene: THREE.Scene) => {
  // to do, create like a react tree exposing props passed to component?
}

const toGraph = (scene: THREE.Scene) => {
  // to do, create scene graph
}

reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: 'react-three-test-renderer',
  version,
})

const create = (element: React.ReactNode, options?: ReactThreeTestRendereOptions) => {
  const canvas = createCanvas(options)
  const scene = render(element, canvas)

  return {
    scene,
    unmount,
    update(newElement: React.ReactNode) {
      const fiber = mockRoots.get(canvas)?.fiber
      if (fiber) {
        reconciler.updateContainer(newElement, fiber, null, () => null)
      } else {
        return
      }
    },
    toTree: () => {
      if (!scene) {
        return
      } else {
        return toTree(scene)
      }
    },
    toGraph: () => {
      if (!scene) {
        return
      } else {
        return toGraph(scene)
      }
    },
  }
}

const ReactThreeTestRenderer = {
  create,
  act: reconciler.act,
}

export default ReactThreeTestRenderer
