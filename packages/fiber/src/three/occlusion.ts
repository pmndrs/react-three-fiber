/**
 * @fileoverview Occlusion observer material - WEBGPU ENTRIES ONLY
 *
 * Occlusion queries (`onOccluded` / `onVisible`) are a WebGPURenderer feature: `renderer.isOccluded()`
 * only has an answer from inside the render pass. Core's visibility system (src/core/visibility.ts)
 * gets that read by rendering a tiny observer mesh whose material runs a callback mid-pass. The
 * material is the one WebGPU-only piece of the system, so it lives here behind the `#three` barrel:
 * ./index.ts and ./webgpu.ts re-export it, ./legacy.ts exports a stub in its place. Core never
 * imports `three/webgpu` or `three/tsl` for it, which is what keeps `@react-three/fiber/legacy`
 * linking against plain `three`. See https://github.com/pmndrs/react-three-fiber/issues/3921
 */

import { MeshBasicNodeMaterial, type Renderer } from 'three/webgpu'
import { uniform } from 'three/tsl'

/**
 * Create the observer material.
 *
 * @param onRender - Runs inside the render pass, once per render of the mesh carrying this material,
 *                   with the renderer that is mid-pass: the only time `renderer.isOccluded()` can be asked.
 */
export function createOcclusionObserverMaterial(onRender: (renderer: Renderer) => void): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial({ transparent: true, opacity: 0 })
  // A uniform is the smallest node the material will keep in its graph, and its per-object update
  // hook is three's own way of running code during the pass (NodeFrame drives it), so there is no
  // Node subclass or hand-patched update() to maintain. Returning undefined leaves the value alone.
  material.colorNode = uniform(0).onObjectUpdate((frame) => {
    if (frame.renderer) onRender(frame.renderer)
    return undefined
  })
  material.needsUpdate = true
  return material
}
