/**
 * @react-three/tsl — TSL resource hooks for react-three-fiber (WebGPU).
 *
 *   import { useUniforms, useNodes } from '@react-three/tsl'
 *
 * Builds on @react-three/fiber through the three-free `@react-three/fiber/extension` entry, so it
 * works under a <Canvas> from `@react-three/fiber` (with the `renderer` prop) or
 * `@react-three/fiber/webgpu` without pulling a second copy of fiber's core into the app.
 *
 * Resources live on the primary canvas's RootState, so they read the same everywhere:
 *
 *   useFrame(({ uniforms }) => { uniforms.uTime.value += 1 })
 *   const uniforms = useThree((s) => s.uniforms)
 */

// Typed uniforms by registration (declare module '@react-three/tsl' { interface Register {...} })
export type {
  Register,
  AppUniforms,
  RegisteredUniforms,
  RegisteredScopes,
  RootUniformInput,
  ScopeUniformInput,
  RegisteredScopeUniforms,
  RegisteredUniform,
} from './register'

// Global TSL and render-pipeline types, and the RootState augmentation
export type * from '../types'

// Registering the root extension is this module's side effect (see `sideEffects` in package.json):
// every root configured after the import, and every live one, gets its TSL fields.
import { ensureTSLExtension } from './internal/tslExtension'
ensureTSLExtension()

// Uniforms that exist on every primary canvas from the start (the runtime half of Register)
export { configureTSL, type TSLConfig } from './internal/configure'

// ScopedStore - type-safe wrapper for creator function state
export { createScopedStore, type ScopedStoreType, type CreatorState } from './internal/ScopedStore'

// Uniforms - root-level + scoped with create-if-not-exists pattern
// Note: UniformNode and UniformRecord are global types from types/tsl.d.ts
export {
  useUniforms,
  // Global rebuild function for HMR integration
  rebuildAllUniforms,
  type UniformCreator,
  type RemoveUniformsFn,
  type ClearUniformsFn,
  type RebuildUniformsFn,
  type UniformsWithUtils,
} from './useUniforms'

// Single uniform - simple create/get/update API
export { useUniform, type UniformValue } from './useUniform'

// Nodes - root-level + scoped with create-if-not-exists pattern
export {
  useNodes,
  useLocalNodes,
  // Global rebuild function for HMR integration
  rebuildAllNodes,
  type TSLNode,
  type TSLNodeLike,
  type NodeCreator,
  type LocalNodeCreator,
  type RemoveNodesFn,
  type ClearNodesFn,
  type RebuildNodesFn,
  type NodesWithUtils,
} from './useNodes'

// Buffers - root-level + scoped with create-if-not-exists pattern
export {
  useBuffers,
  // Global rebuild function for HMR integration
  rebuildAllBuffers,
  type BufferCreator,
  type RemoveBuffersFn,
  type ClearBuffersFn,
  type RebuildBuffersFn,
  type DisposeBuffersFn,
  type BuffersWithUtils,
} from './useBuffers'

// GPU Storage - root-level + scoped with create-if-not-exists pattern
export {
  useGPUStorage,
  // Global rebuild function for HMR integration
  rebuildAllStorage,
  type StorageCreator,
  type RemoveStorageFn,
  type ClearStorageFn,
  type RebuildStorageFn,
  type DisposeStorageFn,
  type StorageWithUtils,
} from './useGPUStorage'

// RenderPipeline - WebGPU render pipeline management
// Types are declared globally in types/renderPipeline.d.ts
export { useRenderPipeline } from './useRenderPipeline'
