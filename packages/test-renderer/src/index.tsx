import * as React from 'react'
import * as THREE from 'three'

import { extend, _roots as mockRoots, createRoot, reconciler, act } from '@react-three/fiber'

import { toTree } from './helpers/tree'
import { toGraph } from './helpers/graph'
import { is } from './helpers/is'

import { createCanvas } from './createTestCanvas'
import { createEventFirer } from './fireEvent'

import type { MockScene } from './types/internal'
import type { CreateOptions, Renderer } from './types/public'
import { wrapFiber } from './createTestInstance'
import { waitFor, WaitOptions } from './helpers/waitFor'

// Extend catalogue for render API in tests.
extend(THREE)

const create = async (element: React.ReactNode, options?: Partial<CreateOptions>): Promise<Renderer> => {
  const canvas = createCanvas(options)

  const _root = createRoot(canvas).configure({
    frameloop: 'never',
    // TODO: remove and use default behavior
    size: {
      width: options?.width ?? 1280,
      height: options?.height ?? 800,
      top: 0,
      left: 0,
      updateStyle: typeof HTMLCanvasElement !== 'undefined' && canvas instanceof HTMLCanvasElement,
    },
    ...options,
    events: undefined,
  })
  const _store = mockRoots.get(canvas)!.store

  await act(async () => _root.render(element))
  const scene = _store.getState().scene as unknown as MockScene

  return {
    scene: wrapFiber(scene),
    async unmount() {
      await act(async () => _root.unmount())
    },
    getInstance() {
      // Bail if canvas is unmounted
      if (!mockRoots.has(canvas)) return null

      // Traverse fiber nodes for R3F root
      const root = { current: mockRoots.get(canvas)!.fiber.current }
      while (!root.current.child?.stateNode) root.current = root.current.child

      // Return R3F instance from root
      return reconciler.getPublicRootInstance(root)
    },
    async update(newElement: React.ReactNode) {
      if (!mockRoots.has(canvas)) return console.warn('RTTR: attempted to update an unmounted root!')

      await act(async () => _root.render(newElement))
    },
    toTree() {
      return toTree(scene)
    },
    toGraph() {
      return toGraph(scene)
    },
    fireEvent: createEventFirer(_store),
    async advanceFrames(frames: number, delta: number | number[] = 1) {
      const state = _store.getState()
      const storeSubscribers = state.internal.subscribers

      const promises: Promise<void>[] = []

      for (const subscriber of storeSubscribers) {
        for (let i = 0; i < frames; i++) {
          if (is.arr(delta)) {
            promises.push(
              new Promise(() => subscriber.ref.current(state, (delta as number[])[i] || (delta as number[])[-1])),
            )
          } else {
            promises.push(new Promise(() => subscriber.ref.current(state, delta as number)))
          }
        }
      }

      Promise.all(promises)
    },
  }
}

export { create, act, waitFor }
export type { WaitOptions }

export * as ReactThreeTest from './types'
export default { create, act, waitFor }
