import * as THREE from 'three'
import * as React from 'react'
import { RootTag } from 'react-reconciler'

import { _createRenderer as createRenderer, _createLoop as createLoop } from 'react-three-fiber'
import type { Root } from 'react-three-fiber/src/core/renderer'
import type { RenderProps } from 'react-three-fiber/src/web'

import { toTree, ReactThreeTestRendererTree } from './helpers/tree'
import { toGraph, ReactThreeTestRendererSceneGraph } from './helpers/graph'
import { is } from './helpers/is'

import { createStore, MockUseStoreState, context, MockScene } from './createMockStore'
import { createCanvas, CreateCanvasParameters } from './createTestCanvas'
import { createWebGLContext } from './createWebGLContext'

export type ReactThreeTestRendererOptions = CreateCanvasParameters & RenderProps

const mockRoots = new Map<any, Root>()
const modes = ['legacy', 'blocking', 'concurrent']
const { advance, invalidate } = createLoop(mockRoots)
const { reconciler, applyProps } = createRenderer(mockRoots)

const render = <TRootNode,>(
  element: React.ReactNode,
  id: TRootNode,
  { size = { width: 0, height: 0 }, mode = 'blocking', ...props }: RenderProps = {},
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
    store = createStore(applyProps, invalidate, advance, {
      // @ts-ignore
      gl: new THREE.WebGLRenderer({ context: createWebGLContext(id as HTMLCanvasElement), precision: 'highp' }),
      size,
      frameloop: 'never',
      ...props,
    })

    fiber = reconciler.createContainer(store, modes.indexOf(mode) as RootTag, false, null)
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
  unmount: () => Promise<void>
  getInstance: () => null | unknown
  update: (el: React.ReactNode) => Promise<void>
  toTree: () => ReactThreeTestRendererTree | undefined
  toGraph: () => ReactThreeTestRendererSceneGraph | undefined
  advanceFrames: (frames: number, delta: number | number[]) => void
}

const create = async (
  element: React.ReactNode,
  options: Partial<ReactThreeTestRendererOptions> = {},
): Promise<ThreeTestRenderer> => {
  const canvas = createCanvas({
    width: options?.width,
    height: options?.height,
  })

  const _fiber = canvas

  let scene: MockScene | null = null

  await reconciler.act(async () => {
    scene = render(element, _fiber, options as RenderProps) as MockScene
  })

  return {
    scene: (scene as unknown) as MockScene,
    unmount: async () => {
      await reconciler.act(async () => {
        unmount(_fiber)
      })
    },
    getInstance: () => {
      // this is our root
      const fiber = mockRoots.get(_fiber)?.fiber
      const root = {
        /**
         * we wrap our child in a Provider component
         * and context.Provider, so do a little
         * artificial dive to get round this and
         * pass context.Provider as if it was the
         * actual react root
         */
        current: fiber.current.child.child,
      }
      if (root) {
        /**
         * so this actually returns the instance
         * the user has passed through as a Fiber
         */
        return reconciler.getPublicRootInstance(root)
      } else {
        return null
      }
    },
    update: async (newElement: React.ReactNode) => {
      const fiber = mockRoots.get(_fiber)?.fiber
      if (fiber) {
        await reconciler.act(async () => {
          reconciler.updateContainer(newElement, fiber, null, () => null)
        })
      }
      return
    },
    toTree: () => {
      // console.log(scene)
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
    advanceFrames: (frames: number, delta: number | number[] = 1) => {
      const root = mockRoots.get(_fiber)

      if (!root) {
        return
      }

      const state = root.store.getState()
      const storeSubscribers = state.internal.subscribers

      storeSubscribers.forEach((subscriber) => {
        for (let i = 0; i < frames; i++) {
          if (is.arr(delta)) {
            subscriber.ref.current(state, (delta as number[])[i] || (delta as number[])[-1])
          } else {
            subscriber.ref.current(state, delta as number)
          }
        }
      })
    },
  }
}

export default {
  create,
  act: reconciler.act,
}
