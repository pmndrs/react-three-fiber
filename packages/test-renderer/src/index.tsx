import * as React from 'react'
import * as THREE from 'three'

import { extend, _roots as mockRoots, createRoot, reconciler, act } from '@react-three/fiber'

import { toTree } from './helpers/tree'
import { toGraph } from './helpers/graph'
import { is } from './helpers/is'

import { createCanvas } from './createTestCanvas'
import { createWebGLContext } from './createWebGLContext'
import { createEventFirer } from './fireEvent'

import type { MockScene } from './types/internal'
import type { CreateOptions, Renderer } from './types/public'
import { wrapFiber } from './createTestInstance'

// Extend catalogue for render API in tests.
extend(THREE)

type X =
  | ((contextId: 'webgl', options?: WebGLContextAttributes) => WebGLRenderingContext | null)
  | ((contextId: 'webgl2', options?: WebGLContextAttributes) => WebGL2RenderingContext | null)
const create = async (element: React.ReactNode, options?: Partial<CreateOptions>): Promise<Renderer> => {
  const canvas = createCanvas({
    width: options?.width,
    height: options?.height,
    beforeReturn: (canvas) => {
      function getContext(contextId: '2d', options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null
      function getContext(
        contextId: 'bitmaprenderer',
        options?: ImageBitmapRenderingContextSettings,
      ): ImageBitmapRenderingContext | null
      function getContext(contextId: 'webgl', options?: WebGLContextAttributes): WebGLRenderingContext | null
      function getContext(contextId: 'webgl2', options?: WebGLContextAttributes): WebGL2RenderingContext | null
      function getContext(contextId: string): RenderingContext | null {
        if (contextId === 'webgl' || contextId === 'webgl2') {
          return createWebGLContext(canvas)
        }
        return null
      }

      canvas.getContext = getContext
    },
  })

  const _fiber = canvas

  const _root = createRoot(_fiber).configure({ frameloop: 'never', ...options, events: undefined })

  let scene: MockScene = null!

  await act(async () => {
    scene = _root.render(element).getState().scene as unknown as MockScene
  })

  const _store = mockRoots.get(_fiber)!.store

  return {
    scene: wrapFiber(scene),
    unmount: async () => {
      await act(async () => {
        _root.unmount()
      })
    },
    getInstance: () => {
      // this is our root
      const fiber = mockRoots.get(_fiber)?.fiber
      const current = fiber?.current.child.child
      if (current) {
        const root = {
          /**
           * we wrap our child in a Provider component
           * and context.Provider, so do a little
           * artificial dive to get round this and
           * pass context.Provider as if it was the
           * actual react root
           */
          current,
        }

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
        await act(async () => {
          reconciler.updateContainer(newElement, fiber, null, () => null)
        })
      }
      return
    },
    toTree: () => {
      return toTree(scene)
    },
    toGraph: () => {
      return toGraph(scene)
    },
    fireEvent: createEventFirer(act, _store),
    advanceFrames: async (frames: number, delta: number | number[] = 1) => {
      const state = _store.getState()
      const storeSubscribers = state.internal.subscribers

      const promises: Promise<void>[] = []

      storeSubscribers.forEach((subscriber) => {
        for (let i = 0; i < frames; i++) {
          if (is.arr(delta)) {
            promises.push(
              new Promise(() => subscriber.ref.current(state, (delta as number[])[i] || (delta as number[])[-1])),
            )
          } else {
            promises.push(new Promise(() => subscriber.ref.current(state, delta as number)))
          }
        }
      })

      Promise.all(promises)
    },
  }
}

export * as ReactThreeTest from './types'
export default { create, act }
