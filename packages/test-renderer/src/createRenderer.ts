/**
 * @fileoverview Shared Test Renderer Implementation
 *
 * Core implementation shared by all entry points (default, legacy, webgpu).
 * Each entry point passes its specific imports to createTestRenderer.
 */

import * as React from 'react'
import * as THREE from 'three'

import { toTree } from './helpers/tree'
import { toGraph } from './helpers/graph'

import { createCanvas, RendererMode } from './createTestCanvas'
import { createEventFirer } from './fireEvent'

import type { CreateOptions, Renderer } from './types/public'
import { wrapFiber } from './createTestInstance'
import { waitFor, WaitOptions } from './helpers/waitFor'
import type { Instance } from '@react-three/fiber'

//* Types ==============================

/**
 * Dependencies injected by each entry point
 */
export interface RendererDependencies {
  /** THREE namespace to extend */
  THREE: any
  /** createRoot from the appropriate fiber entry */
  createRoot: any
  /** _roots map from fiber */
  mockRoots: Map<any, any>
  /** reconciler from fiber */
  reconciler: any
  /** act from fiber */
  act: any
  /** extend function from fiber */
  extend: (objects: object) => void
  /** Renderer mode for canvas context */
  mode: RendererMode
}

//* Factory ==============================

/**
 * Creates a test renderer with the provided dependencies
 *
 * @param deps - Dependencies from the specific entry point
 */
export function createTestRenderer(deps: RendererDependencies) {
  const { THREE, createRoot, mockRoots, reconciler, act, extend, mode } = deps

  // Extend catalogue for render API in tests
  extend(THREE as any)

  /**
   * Create a test renderer instance for testing R3F scenes
   *
   * @param element - React element to render
   * @param options - Configuration options
   */
  const create = async (element: React.ReactNode, options?: Partial<CreateOptions>): Promise<Renderer> => {
    const canvas = createCanvas({ ...options, mode })

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

        // Traverse fiber nodes for R3F root
        const root = { current: mockRoots.get(canvas)!.fiber.current }
        while (root.current.child && !root.current.child.stateNode) root.current = root.current.child

        // Return null if no child (e.g., after unmount cleared the tree)
        if (!root.current.child) return null

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
        const scheduler = state.internal.scheduler

        // Use the scheduler's step() method if available (new scheduler system)
        if (scheduler) {
          // Reset timing state to ensure deterministic behavior
          // This prevents timing pollution from previous tests or scheduler state
          if (scheduler.resetTiming) {
            scheduler.resetTiming()
          }

          // Use a fixed base time for deterministic deltas
          let baseTime = 0

          // Initialize scheduler timing with first step (delta=0)
          scheduler.step(baseTime)

          // Now run the requested frames, each with the specified delta
          for (let i = 0; i < frames; i++) {
            const frameDeltaSeconds = Array.isArray(delta) ? (delta[i] ?? delta[delta.length - 1]) : delta
            const frameDeltaMs = frameDeltaSeconds * 1000

            baseTime += frameDeltaMs
            scheduler.step(baseTime)
          }
          return
        }

        // Fallback to legacy subscriber system for backwards compatibility
        const storeSubscribers = state.internal.subscribers
        const promises: Promise<void>[] = []

        storeSubscribers.forEach((subscriber: any) => {
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

  return { create, act, waitFor }
}

export type { WaitOptions, Renderer, CreateOptions }
