/**
 * Node materials attached under the legacy WebGLRenderer — Tier 1 (jsdom).
 *
 * Omitting `renderer` on <Canvas> (default entry) gives the legacy WebGLRenderer, which cannot
 * compile node materials; three then throws an unactionable `reading 'replace'` on the first
 * frame. A node material element is not part of a WebGL root's namespace, so it throws at once with
 * the fix in the error; a node material instance made by the app warns once per root when attached.
 *
 * Notes on the harness:
 *  - `Canvas` comes from the default entry, so a <Canvas> without `renderer` really is a
 *    WebGLRenderer here, and `<Canvas renderer>` really is a WebGPURenderer on its WebGL2 backend.
 *  - `frameloop="never"` keeps the WebGLRenderer from trying to draw the fake material.
 *
 * @see https://github.com/pmndrs/react-three-fiber/issues/3889
 */
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import { vi, type MockInstance } from 'vitest'
import type * as THREE from 'three'
import { Canvas } from '../src'
import { createStore } from '../src/core/store'
import { warnIfNodeMaterialOnLegacyRenderer } from '../src/core/utils/nodeMaterial'
import type { RootState } from '../types'

const noop = () => {}

// Node materials carry `isNodeMaterial`; nothing else about them matters to the check.
const makeNodeMaterial = () => ({ isMaterial: true, isNodeMaterial: true, dispose: noop })

const isNodeMaterialWarning = (msg: unknown) =>
  typeof msg === 'string' && /node material/i.test(msg) && /renderer/i.test(msg)

function NodeMesh({ material }: { material: object }) {
  return (
    <mesh>
      <boxGeometry />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

describe('node material under the legacy WebGLRenderer', () => {
  let warn: MockInstance<typeof console.warn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(noop)
  })

  afterEach(() => {
    warn.mockRestore()
  })

  const nodeMaterialWarnings = () => warn.mock.calls.filter(([msg]) => isNodeMaterialWarning(msg))

  it('warns once per root, with the fix, when <Canvas> has no renderer prop', async () => {
    let state: RootState = null!
    const material = makeNodeMaterial()
    const second = makeNodeMaterial()

    const { rerender } = await act(async () =>
      render(
        <Canvas frameloop="never" onCreated={(created) => (state = created)}>
          <NodeMesh material={material} />
          <NodeMesh material={second} />
        </Canvas>,
      ),
    )

    // The tree mounted under a legacy WebGLRenderer and the material was attached
    expect(state.isLegacy).toBe(true)
    expect(state.scene.children.map((child) => (child as THREE.Mesh).material)).toEqual(
      expect.arrayContaining([material, second]),
    )

    const calls = nodeMaterialWarnings()
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toContain('Pass `renderer` to <Canvas>')

    // Attaching another node material to the same root does not warn again
    await act(async () =>
      rerender(
        <Canvas frameloop="never" onCreated={(created) => (state = created)}>
          <NodeMesh material={material} />
          <NodeMesh material={second} />
          <NodeMesh material={makeNodeMaterial()} />
        </Canvas>,
      ),
    )

    expect(nodeMaterialWarnings()).toHaveLength(1)
  })

  it('does not warn when <Canvas renderer> runs WebGPURenderer (WebGL2 backend in jsdom)', async () => {
    let state: RootState = null!
    const material = makeNodeMaterial()

    await act(async () =>
      render(
        <Canvas renderer frameloop="never" onCreated={(created) => (state = created)}>
          <NodeMesh material={material} />
        </Canvas>,
      ),
    )

    expect(state.isLegacy).toBe(false)
    expect(state.internal.actualRenderer).toBeDefined()
    expect((state.scene.children[1] as THREE.Mesh).material).toBe(material)

    expect(nodeMaterialWarnings()).toHaveLength(0)
  })

  it('warns for a node material passed as the `material` prop', async () => {
    const material = makeNodeMaterial()
    const mesh = React.createRef<THREE.Mesh>()

    await act(async () =>
      render(
        <Canvas frameloop="never">
          <mesh ref={mesh} material={material as unknown as THREE.Material}>
            <boxGeometry />
          </mesh>
        </Canvas>,
      ),
    )

    expect(mesh.current!.material).toBe(material)
    expect(nodeMaterialWarnings()).toHaveLength(1)
  })

  it('warns for a node material inside a multi-material array prop', async () => {
    const materials = [{ isMaterial: true, dispose: noop }, makeNodeMaterial()]

    await act(async () =>
      render(
        <Canvas frameloop="never">
          <mesh material={materials as unknown as THREE.Material[]}>
            <boxGeometry />
          </mesh>
        </Canvas>,
      ),
    )

    expect(nodeMaterialWarnings()).toHaveLength(1)
  })

  it('does not warn for an ordinary `material` prop', async () => {
    await act(async () =>
      render(
        <Canvas frameloop="never">
          <mesh material={{ isMaterial: true, dispose: noop } as unknown as THREE.Material}>
            <boxGeometry />
          </mesh>
        </Canvas>,
      ),
    )

    expect(nodeMaterialWarnings()).toHaveLength(0)
  })

  it('is silent when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      await act(async () =>
        render(
          <Canvas frameloop="never">
            <NodeMesh material={makeNodeMaterial()} />
          </Canvas>,
        ),
      )
    } finally {
      vi.unstubAllEnvs()
    }

    expect(nodeMaterialWarnings()).toHaveLength(0)
  })

  it('does not warn for ordinary materials', async () => {
    await act(async () =>
      render(
        <Canvas frameloop="never">
          <mesh>
            <boxGeometry />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      ),
    )

    expect(nodeMaterialWarnings()).toHaveLength(0)
  })

  it('throws with the fix for a node material element when <Canvas> has no renderer prop', async () => {
    // The repro from #3889: the WebGL root's namespace has no node materials
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

    const errSpy = vi.spyOn(console, 'error').mockImplementation(noop)
    try {
      await act(async () =>
        render(
          <Boundary>
            <Canvas frameloop="never">
              <mesh>
                <boxGeometry />
                <meshStandardNodeMaterial />
              </mesh>
            </Canvas>
          </Boundary>,
        ),
      )
    } finally {
      errSpy.mockRestore()
    }

    expect(caught!.message).toContain('MeshStandardNodeMaterial')
    expect(caught!.message).toContain('Pass `renderer` to <Canvas>')
  })

  describe('renderer not yet resolved at attach time', () => {
    // Drive the helper against a bare store so the deferred path is covered without a root:
    // the verdict must wait for the store update that publishes the renderer.
    const attachTo = (root: ReturnType<typeof createStore>) =>
      warnIfNodeMaterialOnLegacyRenderer(root, makeNodeMaterial())

    it('warns once the renderer lands and turns out to be legacy', () => {
      const root = createStore(noop, noop)
      attachTo(root)
      expect(nodeMaterialWarnings()).toHaveLength(0)

      // Mirrors configure(): assign the renderer in place, then publish through set()
      root.getState().internal.actualRenderer = { isFakeRenderer: true } as any
      root.setState({ isLegacy: true })
      expect(nodeMaterialWarnings()).toHaveLength(1)

      // Later updates do not repeat it
      root.setState({ isLegacy: true })
      attachTo(root)
      expect(nodeMaterialWarnings()).toHaveLength(1)
    })

    it('stays silent once the renderer lands and is a WebGPURenderer', () => {
      const root = createStore(noop, noop)
      attachTo(root)

      root.getState().internal.actualRenderer = { isFakeRenderer: true } as any
      root.setState({ webGPUSupported: false })
      expect(nodeMaterialWarnings()).toHaveLength(0)
    })
  })
})
