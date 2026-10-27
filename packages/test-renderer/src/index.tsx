import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'

import { extend, _roots as mockRoots, createRoot, reconciler, Instance } from '@react-three/fiber'

import { toTree } from './helpers/tree'
import { toGraph } from './helpers/graph'

import { createCanvas } from './createTestCanvas'
import { createEventFirer } from './fireEvent'

import type { CreateOptions, Renderer } from './types/public'
import { wrapFiber } from './createTestInstance'
import { waitFor, WaitOptions } from './helpers/waitFor'

// Extend catalogue for render API in tests.
extend(THREE as any)

const create = async (element: React.ReactNode, options?: Partial<CreateOptions>): Promise<Renderer> => {
  const canvas = createCanvas(options)

  const _root = createRoot(canvas)
  await _root.configure({
    frameloop: 'never',
    // TODO: remove and use default behavior
    size: {
      width: options?.width ?? 1280,
      height: options?.height ?? 800,
      top: 0,
      left: 0,
    },
    ...options,
    events: undefined,
  })

  const _store = mockRoots.get(canvas)!.store

  await act(async () => _root.render(element))
  const _scene = (_store.getState().scene as Instance<THREE.Scene>['object']).__r3f!

  return {
    scene: wrapFiber(_scene),
    async unmount() {
      await act(async () => {
        _root.unmount()
      })
    },
    getInstance() {
      // Bail if canvas is unmounted
      if (!mockRoots.has(canvas)) return null

      // Find the first public instance, including siblings of empty components.
      const root = mockRoots.get(canvas)!.fiber
      const fibers = root.current.child ? [root.current.child] : []
      while (fibers.length) {
        const fiber = fibers.pop()!
        if (fiber.stateNode) {
          return reconciler.getPublicRootInstance({ current: { child: fiber } })
        }
        if (fiber.sibling) fibers.push(fiber.sibling)
        if (fiber.child) fibers.push(fiber.child)
      }
      return null
    },
    async update(newElement: React.ReactNode) {
      if (!mockRoots.has(canvas)) return console.warn('RTTR: attempted to update an unmounted root!')

      await act(async () => {
        _root.render(newElement)
      })
    },
    toTree() {
      return toTree(_scene)
    },
    toGraph() {
      return toGraph(_scene)
    },
    fireEvent: createEventFirer(act, _store),
    async advanceFrames(frames: number, delta: number | number[] = 1) {
      const state = _store.getState()
      const storeSubscribers = state.internal.subscribers

      const promises: Promise<void>[] = []

      storeSubscribers.forEach((subscriber) => {
        for (let i = 0; i < frames; i++) {
          if (Array.isArray(delta)) {
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

export { create, act, waitFor }
export type { WaitOptions }

export * as ReactThreeTest from './types'
export default { create, act, waitFor }
