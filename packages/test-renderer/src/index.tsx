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

  const _root = createRoot(canvas).configure({ frameloop: 'never', ...options, events: undefined })
  const _store = mockRoots.get(canvas)!.store

  await act(async () => _root.render(element))
  const _scene = (_store.getState().scene as any).__r3f as MockInstance<THREE.Scene>

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

      // Traverse fiber nodes for R3F root
      let root = { current: mockRoots.get(canvas)!.fiber.current }
      while (root.current.stateNode !== _scene) root.current = root.current.child

      // Return R3F instance from root
      return reconciler.getPublicRootInstance(root)
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
