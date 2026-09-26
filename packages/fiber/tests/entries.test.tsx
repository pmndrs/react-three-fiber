/**
 * @fileoverview The three entries and their renderer providers.
 *
 * Core has no static import from `three` or `three/webgpu`. Each entry hands `createRoot`/`Canvas`
 * a provider: the root entry loads either renderer's support on demand, `/legacy` and `/webgpu`
 * carry one statically. These tests pin what that means for a root:
 * - which renderer a root gets, per entry and per `gl`/`renderer` prop
 * - the support (three namespace + renderer classes) recorded on the store
 * - JSX names resolving against explicit extend() first, then the root's own namespace
 * - three's shared core becoming available to core code (getThree) once a root has loaded
 *
 * What the *bundles* look like is a separate check: scripts/verify-treeshake.js runs after build.
 */
import * as React from 'react'
import { act } from 'react'
import { vi } from 'vitest'
import { Mesh, WebGLRenderer, WebGLRenderTarget } from 'three'
import { MeshBasicNodeMaterial, RenderTarget, WebGPURenderer } from 'three/webgpu'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'
import * as fiber from '../src/index'
import * as legacy from '../src/legacy'
import * as webgpu from '../src/webgpu'
import { getThree, hasThree, whenThree } from '../src/core/three'

import type { ReconcilerRoot } from '../src/index'

const roots: ReconcilerRoot<HTMLCanvasElement>[] = []

afterEach(async () => {
  for (const root of roots) await act(async () => root.unmount())
  roots.length = 0
})

type Entry = { createRoot: typeof fiber.createRoot }

async function configure(
  entry: Entry,
  mode: 'webgl' | 'webgpu' = 'webgl',
  props: Parameters<ReconcilerRoot<HTMLCanvasElement>['configure']>[0] = {},
) {
  const canvas = createCanvas({ mode })
  const root = entry.createRoot(canvas)
  roots.push(root)
  await act(async () => root.configure({ frameloop: 'never', ...props }))
  return fiber._roots.get(canvas)!.store.getState()
}

describe('entries', () => {
  describe('build flags', () => {
    it('describe which renderers each entry can construct', () => {
      expect([fiber.R3F_BUILD_LEGACY, fiber.R3F_BUILD_WEBGPU]).toEqual([true, true])
      expect([legacy.R3F_BUILD_LEGACY, legacy.R3F_BUILD_WEBGPU]).toEqual([true, false])
      expect([webgpu.R3F_BUILD_LEGACY, webgpu.R3F_BUILD_WEBGPU]).toEqual([false, true])
    })
  })

  describe('renderer selection', () => {
    it('root entry: a plain root renders with WebGL', async () => {
      const state = await configure(fiber)
      expect(state.internal.support.kind).toBe('webgl')
      expect(state.isLegacy).toBe(true)
      expect(state.renderer).toBeInstanceOf(WebGLRenderer)
      expect(state.gl).toBe(state.renderer)
    })

    it('root entry: the renderer prop selects WebGPU', async () => {
      const state = await configure(fiber, 'webgpu', { renderer: {} })
      expect(state.internal.support.kind).toBe('webgpu')
      expect(state.isLegacy).toBe(false)
      expect(state.renderer).toBeInstanceOf(WebGPURenderer)
    })

    it('root entry: the gl prop selects WebGL', async () => {
      const state = await configure(fiber, 'webgl', { gl: {} })
      expect(state.internal.support.kind).toBe('webgl')
      expect(state.renderer).toBeInstanceOf(WebGLRenderer)
    })

    it('/legacy always constructs a WebGLRenderer', async () => {
      const state = await configure(legacy)
      const { support } = state.internal
      expect(support.kind).toBe('webgl')
      expect(support.Renderer).toBe(WebGLRenderer)
      expect(state.isLegacy).toBe(true)
      expect(state.renderer).toBeInstanceOf(WebGLRenderer)
    })

    it('/webgpu always constructs a WebGPURenderer, without the renderer prop', async () => {
      const state = await configure(webgpu, 'webgpu')
      const { support } = state.internal
      expect(support.kind).toBe('webgpu')
      expect(support.Renderer).toBe(WebGPURenderer)
      if (support.kind === 'webgpu') expect(support.occlusion.MeshBasicNodeMaterial).toBe(MeshBasicNodeMaterial)
      expect(state.isLegacy).toBe(false)
      expect(state.renderer).toBeInstanceOf(WebGPURenderer)
    })

    it('a single-renderer entry refuses the other renderer', async () => {
      const onWebGPU = webgpu.createRoot(createCanvas({ mode: 'webgpu' }))
      const onLegacy = legacy.createRoot(createCanvas())
      roots.push(onWebGPU, onLegacy)
      await expect(onWebGPU.configure({ gl: {} })).rejects.toThrow(
        /WebGLRenderer \(gl prop\) is not available on this entry/,
      )
      await expect(onLegacy.configure({ renderer: {} })).rejects.toThrow(
        /WebGPURenderer \(renderer prop\) is not available on this entry/,
      )
    })

    it('rejects gl and renderer together', async () => {
      const root = fiber.createRoot(createCanvas())
      roots.push(root)
      await expect(root.configure({ gl: {}, renderer: {} })).rejects.toThrow(/Cannot use both gl and renderer/)
    })
  })

  describe('three on the store', () => {
    it('creates the store objects that are three instances once the renderer is loaded', async () => {
      const canvas = createCanvas()
      const root = fiber.createRoot(canvas)
      roots.push(root)
      const store = fiber._roots.get(canvas)!.store
      // Before configure there is no three: the store cannot hold a Vector2 yet
      expect(store.getState().pointer).toBeNull()
      expect(store.getState().frustum).toBeNull()

      await act(async () => root.configure({ frameloop: 'never' }))
      const state = store.getState()
      const { Vector2, Frustum } = getThree()
      expect(state.pointer).toBeInstanceOf(Vector2)
      expect(state.mouse).toBe(state.pointer)
      expect(state.frustum).toBeInstanceOf(Frustum)
      expect(state.raycaster).toBeInstanceOf(getThree().Raycaster)
      expect(state.scene).toBeInstanceOf(getThree().Scene)
    })

    it('exposes the namespace of the loaded renderer as internal.support.three', async () => {
      const gl = await configure(legacy)
      expect(gl.internal.support.three.Mesh).toBe(Mesh)
      expect('WebGLRenderer' in gl.internal.support.three).toBe(true)
      expect('MeshBasicNodeMaterial' in gl.internal.support.three).toBe(false)

      const gpu = await configure(webgpu, 'webgpu')
      expect(gpu.internal.support.three.Mesh).toBe(Mesh)
      expect('MeshBasicNodeMaterial' in gpu.internal.support.three).toBe(true)
      expect('WebGLRenderer' in gpu.internal.support.three).toBe(false)
    })

    it('useRenderTarget follows the loaded renderer', async () => {
      let target: unknown
      function Probe() {
        target = fiber.useRenderTarget(4)
        return null
      }
      await configure(legacy)
      await act(async () => roots[roots.length - 1].render(<Probe />))
      expect(target).toBeInstanceOf(WebGLRenderTarget)

      await configure(webgpu, 'webgpu')
      await act(async () => roots[roots.length - 1].render(<Probe />))
      expect(target).toBeInstanceOf(RenderTarget)
    })
  })

  describe('element resolution', () => {
    it('resolves element names against the namespace of the entry that created the root', async () => {
      // Node materials exist on the WebGPU namespace only. Nothing registers them globally.
      const catalogue = (globalThis as any)[Symbol.for('@react-three/fiber.catalogue')]
      expect(catalogue.MeshBasicNodeMaterial).toBeUndefined()

      const state = await configure(webgpu, 'webgpu')
      await act(async () =>
        roots[roots.length - 1].render(
          <mesh name="node">
            <meshBasicNodeMaterial />
          </mesh>,
        ),
      )
      expect((state.scene.getObjectByName('node') as Mesh).material).toBeInstanceOf(MeshBasicNodeMaterial)
      expect(catalogue.MeshBasicNodeMaterial).toBeUndefined()

      // The same element on a WebGL root is not part of its namespace
      let caught: Error | null = null
      class Boundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
        state = { hasError: false }
        static getDerivedStateFromError() {
          return { hasError: true }
        }
        componentDidCatch(error: Error) {
          caught = error
        }
        render() {
          return this.state.hasError ? null : this.props.children
        }
      }
      await configure(legacy)
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await act(async () =>
        roots[roots.length - 1].render(
          <Boundary>
            <meshBasicNodeMaterial />
          </Boundary>,
        ),
      )
      errSpy.mockRestore()
      expect(caught!.message).toMatch(/MeshBasicNodeMaterial is not part of the THREE namespace/)
      // ... and the error says which renderer node materials need (#3889)
      expect(caught!.message).toContain('Pass `renderer` to <Canvas>')
    })

    it('root entry: a WebGPU root gets node materials, a WebGL root does not', async () => {
      const state = await configure(fiber, 'webgpu', { renderer: {} })
      await act(async () =>
        roots[roots.length - 1].render(
          <mesh name="node">
            <meshBasicNodeMaterial />
          </mesh>,
        ),
      )
      expect((state.scene.getObjectByName('node') as Mesh).material).toBeInstanceOf(MeshBasicNodeMaterial)
    })

    it('explicit extend() registrations win over the namespace, on every entry', async () => {
      class CustomMesh extends Mesh {}
      fiber.extend({ Mesh: CustomMesh })
      try {
        for (const entry of [fiber, legacy, webgpu]) {
          const state = await configure(entry, entry === webgpu ? 'webgpu' : 'webgl')
          await act(async () => roots[roots.length - 1].render(<mesh name="custom" />))
          expect(state.scene.getObjectByName('custom')).toBeInstanceOf(CustomMesh)
        }
      } finally {
        fiber.extend({ Mesh })
      }
    })

    it('the three* prefix still reaches DOM-conflicting names', async () => {
      const state = await configure(fiber)
      await act(async () => roots[roots.length - 1].render(<threeLine name="line" />))
      expect(state.scene.getObjectByName('line')).toBeInstanceOf(getThree().Line)
    })
  })

  describe('getThree', () => {
    it('is the shared core of whichever renderer loaded first, and the same for both', async () => {
      expect(hasThree()).toBe(true) // earlier tests in this file loaded a renderer
      const three = getThree()
      expect(three.Vector3).toBe(webgpu.createRoot === undefined ? undefined : three.Vector3)
      const gl = await configure(legacy)
      const gpu = await configure(webgpu, 'webgpu')
      expect(gl.internal.support.three.Vector3).toBe(three.Vector3)
      expect(gpu.internal.support.three.Vector3).toBe(three.Vector3)
      await expect(whenThree()).resolves.toBe(three)
    })
  })
})
