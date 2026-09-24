/**
 * Occlusion observer (WebGPU) — #3921 moved the observer into src/three/occlusion.ts and hooks the
 * render pass through `uniform(0).onObjectUpdate(...)` instead of a hand-patched Node subclass.
 *
 * jsdom has no GPU, so nothing else exercises this path: the Canvas tests run a WebGLRenderer and
 * only see the "requires WebGPU" warning. These tests prove the hook is live without a device:
 *  1. A real WGSLNodeBuilder build of the observer material lists the uniform in `updateNodes`,
 *     i.e. three will call its update for every render of the observer mesh (an update hook on a
 *     node that is not reachable from an output would silently never fire).
 *  2. NodeFrame drives that update with `frame.renderer` set, and the callback reaches the renderer.
 *  3. End to end through enableOcclusion(): the render-pass update fills the occlusion cache from
 *     `renderer.isOccluded()` for exactly the registered objects that asked for it.
 */
import { vi, describe, it, expect } from 'vitest'
import * as THREE from 'three/webgpu'
import { context } from 'three/tsl'
import { createOcclusionObserverMaterial } from '../../src/three/occlusion'
import { createStore } from '../../src/core/store'
import { enableOcclusion, disableOcclusion, registerVisibility } from '../../src/core/visibility'

const noop = () => {}

// Just enough of a renderer for NodeBuilder.build() to run the setup/analyze/generate stages.
function builderRenderer(): THREE.Renderer {
  const renderer = {
    contextNode: context(),
    library: new THREE.StandardNodeLibrary(),
    lighting: new THREE.Lighting(),
    toneMapping: THREE.NoToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    currentColorSpace: THREE.SRGBColorSpace,
    xr: { isPresenting: false, enabled: false },
    backend: { isWebGPUBackend: true, compatibilityMode: false, hasFeature: () => false },
    shadowMap: { enabled: false },
    highPrecision: false,
    logarithmicDepthBuffer: false,
    reversedDepthBuffer: false,
    localClippingEnabled: false,
    getRenderTarget: () => null,
    getOutputRenderTarget: () => null,
    getMRT: () => null,
    getCanvasTarget: () => null,
    getColorBufferType: () => THREE.HalfFloatType,
    hasCompatibility: () => false,
  }
  return renderer as unknown as THREE.Renderer
}

// @types/three leaves the build surface of WGSLNodeBuilder undeclared.
interface BuildableNodeBuilder {
  scene: THREE.Scene
  camera: THREE.Camera
  build(): void
  updateNodes: THREE.Node[]
}

function buildObserver(material: THREE.MeshBasicNodeMaterial): BuildableNodeBuilder {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material)
  const builder = new THREE.WGSLNodeBuilder(mesh, builderRenderer()) as unknown as BuildableNodeBuilder
  builder.scene = new THREE.Scene()
  builder.camera = new THREE.PerspectiveCamera()
  builder.build()
  return builder
}

describe('occlusion observer material', () => {
  it('keeps its update hook in the built material graph', () => {
    const material = createOcclusionObserverMaterial(noop)
    const builder = buildObserver(material)

    const hook = material.colorNode as THREE.Node
    expect(hook.getUpdateType()).toBe(THREE.NodeUpdateType.OBJECT)
    expect(builder.updateNodes).toContain(hook)
  })

  it('runs the callback with the rendering renderer on every object update', () => {
    const onRender = vi.fn()
    const material = createOcclusionObserverMaterial(onRender)
    const builder = buildObserver(material)
    const hook = material.colorNode as THREE.Node

    const renderer = { isOccluded: () => false } as unknown as THREE.Renderer
    const frame = new THREE.NodeFrame()
    frame.renderer = renderer

    // OBJECT updates are not deduplicated per frame: each render of the observer calls it again.
    for (let i = 0; i < 2; i++) {
      for (const node of builder.updateNodes) if (node === hook) frame.updateNode(node)
    }

    expect(onRender).toHaveBeenCalledTimes(2)
    expect(onRender).toHaveBeenCalledWith(renderer)
    // The hook must not disturb the uniform the material outputs.
    expect((hook as THREE.UniformNode<'float', number>).value).toBe(0)
  })

  it('does not call back without a renderer on the frame', () => {
    const onRender = vi.fn()
    const material = createOcclusionObserverMaterial(onRender)
    const frame = new THREE.NodeFrame()

    frame.updateNode(material.colorNode as THREE.Node)

    expect(onRender).not.toHaveBeenCalled()
  })
})

describe('enableOcclusion with an isOccluded() renderer', () => {
  it('builds the observer synchronously and fills the cache from the render pass', () => {
    const store = createStore(noop, noop)
    const occluded = new Set<THREE.Object3D>()
    const isOccluded = vi.fn((object: THREE.Object3D) => occluded.has(object))
    store.setState({ rootScene: new THREE.Scene(), renderer: { isOccluded } as unknown as THREE.WebGPURenderer })

    const hidden = new THREE.Mesh()
    const shown = new THREE.Mesh()
    const framedOnly = new THREE.Mesh()
    occluded.add(hidden)

    registerVisibility(store, hidden, { onOccluded: noop })
    registerVisibility(store, shown, { onVisible: noop })
    registerVisibility(store, framedOnly, { onFramed: noop })

    const { internal, rootScene } = store.getState()
    expect(internal.occlusionEnabled).toBe(true)
    const observer = internal.occlusionObserver
    expect(observer).toBeInstanceOf(THREE.Mesh)
    expect(observer!.parent?.parent).toBe(rootScene)
    expect(observer!.frustumCulled).toBe(false)

    // Nothing is read until the observer renders.
    expect(isOccluded).not.toHaveBeenCalled()

    const frame = new THREE.NodeFrame()
    frame.renderer = store.getState().renderer as unknown as THREE.Renderer
    frame.updateNode((observer!.material as THREE.MeshBasicNodeMaterial).colorNode as THREE.Node)

    const { occlusionCache } = store.getState().internal
    expect(occlusionCache.get(hidden)).toBe(true)
    expect(occlusionCache.get(shown)).toBe(false)
    expect(occlusionCache.has(framedOnly)).toBe(false)

    // A second registration must not build a second observer.
    enableOcclusion(store)
    expect(store.getState().internal.occlusionObserver).toBe(observer)

    disableOcclusion(store)
    expect(store.getState().internal.occlusionEnabled).toBe(false)
    expect(observer!.parent).toBeNull()
  })
})
