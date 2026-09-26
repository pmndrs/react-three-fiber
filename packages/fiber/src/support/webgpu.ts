/**
 * @fileoverview WebGPU renderer support
 *
 * The one module in fiber that imports `three/webgpu` and `three/tsl`. It is reached in two ways:
 * - statically, by `@react-three/fiber/webgpu`
 * - as a dynamic import, by `@react-three/fiber`, when a root asks for WebGPU (`renderer` prop)
 *
 * So an app on the root entry that renders a plain `<Canvas>` never downloads this module, nor
 * three's WebGPU renderer and node system with it.
 */

import * as THREE from 'three/webgpu'
import { uniform, nodeObject } from 'three/tsl'
import type { WebGPUSupport } from '#types'

export const webgpuSupport: WebGPUSupport = {
  kind: 'webgpu',
  three: THREE,
  Renderer: THREE.WebGPURenderer,
  RenderTarget: THREE.RenderTarget,
  CubeRenderTarget: THREE.CubeRenderTarget,
  CanvasTarget: THREE.CanvasTarget,
  // What the occlusion observer (core/visibility.ts) is built from
  occlusion: {
    Node: THREE.Node,
    NodeUpdateType: THREE.NodeUpdateType,
    MeshBasicNodeMaterial: THREE.MeshBasicNodeMaterial,
    uniform,
    nodeObject,
  },
}
