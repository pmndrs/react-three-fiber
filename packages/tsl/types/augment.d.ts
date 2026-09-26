import type { RenderPipeline } from 'three/webgpu'
import type { BufferStore, NodeStore, StorageStore } from './resources'

/**
 * The fields @react-three/tsl adds to RootState. Its root extension sets them up on every canvas;
 * a secondary canvas holds its primary's map objects, and portals inherit them from their parent. So
 * `state.uniforms` reads the same in useFrame, useThree, creators and handlers, on any canvas.
 */
export interface TSLRootState {
  /** TSL uniform nodes - root-level uniforms + scoped sub-objects. Use useUniforms() */
  uniforms: UniformStore
  /** TSL nodes - root-level nodes + scoped sub-objects. Use useNodes() */
  nodes: NodeStore
  /** Buffers - root-level buffers + scoped sub-objects. Use useBuffers() */
  buffers: BufferStore
  /** GPU storage (textures, etc.) - root-level storage + scoped sub-objects. Use useGPUStorage() */
  gpuStorage: StorageStore
  /** Internal: bumped by hot reloads and rebuilds to re-run creators */
  _hmrVersion: number
  /** The canvas's RenderPipeline, once useRenderPipeline created one. Per canvas, not shared. */
  renderPipeline?: RenderPipeline | null
  /** Pass nodes registered with useRenderPipeline */
  passes?: PassRecord
}

// Each fiber entry bundles its own copy of RootState, so every entry the hooks can run under is
// augmented. The /legacy entry is not: it never has a WebGPU renderer.
declare module '@react-three/fiber' {
  interface RootState extends TSLRootState {}
}

// /webgpu exports WebGPURootState as RootState. Augmenting the base state it extends reaches both,
// and also the stores (useStore(), get(), primaryStore) typed with the base.
declare module '@react-three/fiber/webgpu' {
  interface BaseRootState extends TSLRootState {}
}

declare module '@react-three/fiber/extension' {
  interface RootState extends TSLRootState {}
}
