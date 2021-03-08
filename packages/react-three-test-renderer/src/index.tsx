import * as THREE from 'three'
import * as React from 'react'

import { is } from 'react-three-fiber/src/core/is'
import { createRenderer, Root } from 'react-three-fiber/src/core/renderer'

import {
  createMockStore,
  MockStoreProps,
  MockUseStoreState,
  context,
  MockScene,
  MockSceneChild,
} from './createMockStore'
import { createCanvas, CreateCanvasParameters } from './createTestCanvas'

type RenderProps = Omit<MockStoreProps, 'gl' | 'context'> & {
  gl?: THREE.WebGLRenderer | THREE.WebGLRendererParameters
  concurrent?: boolean
}

type MockRoot = Omit<Root, 'store'> & {
  store: MockUseStoreState
}

interface ReactThreeTestRendererSceneGraphItem {
  type: string
  name: string
  children: ReactThreeTestRendererSceneGraphItem[] | null
}

interface ReactThreeTestRendererTreeNode {
  type: string
  props: {
    [key: string]: any
  }
  children: ReactThreeTestRendererTreeNode[]
}

export type ReactThreeTestRendererSceneGraph = ReactThreeTestRendererSceneGraphItem[]

export type ReactThreeTestRendererTree = ReactThreeTestRendererTreeNode

export interface ReactThreeTestRendereOptions extends CreateCanvasParameters {}

const mockRoots = new Map<any, MockRoot>()
const { reconciler, applyProps } = createRenderer(mockRoots)

const render = <TRootNode,>(
  element: React.ReactNode,
  id: TRootNode,
  { gl, size, concurrent, ...props }: RenderProps = { size: { width: 0, height: 0 } },
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
    store = createMockStore(applyProps, { gl: {}, size, ...props })

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

const lowerCaseFirstLetter = (str: string) => `${str.charAt(0).toLowerCase()}${str.slice(1)}`

const treeObjectFactory = (
  type: ReactThreeTestRendererTreeNode['type'],
  props: ReactThreeTestRendererTreeNode['props'],
  children: ReactThreeTestRendererTreeNode['children'],
): ReactThreeTestRendererTreeNode => ({
  type,
  props,
  children,
})

const toTreeBranch = (obj: MockSceneChild[]): ReactThreeTestRendererTreeNode[] =>
  obj.map((child) => {
    return treeObjectFactory(
      lowerCaseFirstLetter(child.type || child.constructor.name),
      { ...child.__r3f.memoizedProps },
      toTreeBranch([...(child.children || []), ...child.__r3f.objects]),
    )
  })

const toTree = (scene: MockScene): ReactThreeTestRendererTree => ({
  type: 'scene',
  props: {},
  children: scene.children.map((obj) =>
    treeObjectFactory(
      lowerCaseFirstLetter(obj.type),
      { ...obj.__r3f.memoizedProps },
      toTreeBranch([...obj.children, ...obj.__r3f.objects]),
    ),
  ),
})

const graphObjectFactory = (
  type: ReactThreeTestRendererSceneGraphItem['type'],
  name: ReactThreeTestRendererSceneGraphItem['name'],
  children: ReactThreeTestRendererSceneGraphItem['children'],
): ReactThreeTestRendererSceneGraphItem => ({
  type,
  name,
  children,
})

const toGraph = (object: THREE.Object3D): ReactThreeTestRendererSceneGraphItem[] =>
  object.children.map((child) => graphObjectFactory(child.type, child.name || '', toGraph(child)))

reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: 'react-three-test-renderer',
  // @ts-expect-error it's a babel macro
  version: typeof R3F_VERSION !== 'undefined' ? R3F_VERSION : '0.0.0',
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
