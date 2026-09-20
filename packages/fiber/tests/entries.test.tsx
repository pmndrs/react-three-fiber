/** Entry providers select renderer support and scope JSX constructors to each root. */
import * as React from 'react'
import { act } from 'react'
import { vi } from 'vitest'
import { Mesh, WebGLRenderer } from 'three'
import { MeshBasicNodeMaterial, WebGPURenderer } from 'three/webgpu'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'
import * as fiber from '../src/index'
import * as legacy from '../src/legacy'
import * as webgpu from '../src/webgpu'

import type { ReconcilerRoot } from '../src/index'

const roots: ReconcilerRoot<HTMLCanvasElement>[] = []

afterEach(async () => {
  for (const root of roots) await act(async () => root.unmount())
  roots.length = 0
})

async function configure(entry: { createRoot: typeof fiber.createRoot }, mode: 'webgl' | 'webgpu' = 'webgl') {
  const canvas = createCanvas({ mode })
  const root = entry.createRoot(canvas)
  roots.push(root)
  await act(async () => root.configure({ frameloop: 'never' }))
  return fiber._roots.get(canvas)!.store.getState()
}

describe('entry providers', () => {
  it('preserves explicit constructor overrides when each entry creates its first root', async () => {
    class CustomMesh extends Mesh {}
    fiber.extend({ Mesh: CustomMesh })

    try {
      for (const entry of [fiber, legacy, webgpu]) {
        const state = await configure(entry, entry === webgpu ? 'webgpu' : 'webgl')
        const root = roots[roots.length - 1]
        await act(async () => root.render(<mesh name="custom" />))
        expect(state.scene.getObjectByName('custom')).toBeInstanceOf(CustomMesh)
      }
    } finally {
      fiber.extend({ Mesh })
    }
  })

  it('legacy entry constructs a WebGLRenderer and keeps WebGL support on the store', async () => {
    const state = await configure(legacy)
    expect(state.internal.support.kind).toBe('webgl')
    expect(state.internal.support.Renderer).toBe(WebGLRenderer)
    expect(state.isLegacy).toBe(true)
    expect(state.renderer).toBeInstanceOf(WebGLRenderer)
  })

  it('webgpu entry constructs a WebGPURenderer and keeps WebGPU support on the store', async () => {
    const state = await configure(webgpu, 'webgpu')
    const { support } = state.internal
    expect(support.kind).toBe('webgpu')
    expect(support.Renderer).toBe(WebGPURenderer)
    if (support.kind === 'webgpu') expect(support.occlusion.MeshBasicNodeMaterial).toBeDefined()
    expect(state.isLegacy).toBe(false)
    expect(state.renderer).toBeInstanceOf(WebGPURenderer)
  })

  it('default entry defaults to WebGL without a renderer prop', async () => {
    const state = await configure(fiber)
    expect(state.internal.support.kind).toBe('webgl')
    expect(state.isLegacy).toBe(true)
    expect(state.renderer).toBeInstanceOf(WebGLRenderer)
  })

  it('a root on a single-renderer entry cannot construct the other renderer', async () => {
    const onWebGPU = webgpu.createRoot(createCanvas())
    const onLegacy = legacy.createRoot(createCanvas())
    roots.push(onWebGPU, onLegacy)
    await expect(onWebGPU.configure({ gl: {} })).rejects.toThrow(
      /WebGLRenderer \(gl prop\) is not available on this entry/,
    )
    await expect(onLegacy.configure({ renderer: {} })).rejects.toThrow(
      /WebGPURenderer \(renderer prop\) is not available on this entry/,
    )
  })

  it('resolves element names against the namespace of the entry that created the root', async () => {
    // Node materials are available on the WebGPU and default entries only.
    const catalogue = (globalThis as any)[Symbol.for('@react-three/fiber.catalogue')]
    expect(catalogue.MeshBasicNodeMaterial).toBeUndefined()

    for (const entry of [webgpu, fiber]) {
      const state = await configure(entry, entry === webgpu ? 'webgpu' : 'webgl')
      await act(async () =>
        roots[roots.length - 1].render(
          <mesh name="node">
            <meshBasicNodeMaterial />
          </mesh>,
        ),
      )
      expect((state.scene.getObjectByName('node') as Mesh).material).toBeInstanceOf(MeshBasicNodeMaterial)
    }
    expect(catalogue.MeshBasicNodeMaterial).toBeUndefined()

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
  })
})
