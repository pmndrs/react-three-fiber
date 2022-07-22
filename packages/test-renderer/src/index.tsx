import * as React from 'react'
import * as THREE from 'three'

import { extend, _roots as mockRoots, createRoot, reconciler, act as _act } from '@react-three/fiber'

import { toTree } from './helpers/tree'
import { toGraph } from './helpers/graph'
import { is } from './helpers/is'

import { createCanvas } from './createTestCanvas'
import { createWebGLContext } from './createWebGLContext'
import { createEventFirer } from './fireEvent'

import type { MockInstance } from './types/internal'
import type { CreateOptions, Renderer, Act } from './types/public'
import { wrapFiber } from './createTestInstance'

// Extend catalogue for render API in tests.
extend(THREE)

const act = _act as unknown as Act

const create = async (element: React.ReactNode, options?: Partial<CreateOptions>): Promise<Renderer> => {
  const canvas = createCanvas({
    width: options?.width,
    height: options?.height,
    beforeReturn: (canvas) => {
      //@ts-ignore
      canvas.getContext = (type: string) => {
        if (type === 'webgl' || type === 'webgl2') {
          return createWebGLContext(canvas)
        }
      }
    },
  })

  const _root = createRoot(canvas).configure({ frameloop: 'never', ...options, events: undefined })
  const _store = mockRoots.get(canvas)!.store

  await act(async () => _root.render(element))
  const scene = (_store.getState().scene as any).__r3f as MockInstance<THREE.Scene>

  return {
    scene: wrapFiber(scene),
    async unmount() {
      await act(async () => {
        _root.unmount()
      })
    },
    getInstance() {
      // this is our root
      const fiber = mockRoots.get(canvas)?.fiber
      const current = fiber?.current?.child?.child?.child?.child
      if (!current) return null

      /**
       * we wrap our child in a Provider component
       * and context.Provider, so do a little
       * artificial dive to get round this and
       * pass context.Provider as if it was the
       * actual react root
       */
      const root = { current }

      /**
       * so this actually returns the instance
       * the user has passed through as a Fiber
       */
      return reconciler.getPublicRootInstance(root)
    },
    async update(newElement: React.ReactNode) {
      const fiber = mockRoots.get(canvas)?.fiber
      if (fiber) {
        await act(async () => {
          reconciler.updateContainer(newElement, fiber, null, () => null)
        })
      }
      return
    },
    toTree() {
      return toTree(scene)
    },
    toGraph() {
      return toGraph(scene)
    },
    fireEvent: createEventFirer(act, _store),
    async advanceFrames(frames: number, delta: number | number[] = 1) {
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
