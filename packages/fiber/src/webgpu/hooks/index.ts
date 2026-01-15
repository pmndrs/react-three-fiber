// Uniforms - root-level + scoped with create-if-not-exists pattern
// Note: UniformNode and UniformRecord are global types from types/tsl.d.ts
export {
  useUniforms,
  // Deprecated standalone utils (prefer useUniforms().removeUniforms/clearUniforms)
  removeUniforms,
  clearScope,
  clearRootUniforms,
  type UniformCreator,
  type RemoveUniformsFn,
  type ClearUniformsFn,
  type UniformsWithUtils,
} from './useUniforms'

// Single uniform - simple create/get/update API
export { useUniform, type UniformValue } from './useUniform'

// Nodes - root-level + scoped with create-if-not-exists pattern
export {
  useNodes,
  useLocalNodes,
  // Deprecated standalone utils (prefer useNodes().removeNodes/clearNodes)
  removeNodes,
  clearNodeScope,
  clearRootNodes,
  type TSLNode,
  type NodeRecord,
  type NodeCreator,
  type LocalNodeCreator,
  type RemoveNodesFn,
  type ClearNodesFn,
  type NodesWithUtils,
} from './useNodes'

// Textures - Re-exported from core (useTextures is now a core R3F hook)
// Note: Not re-exported here to avoid duplicate exports since ../core already exports them
// The file ./useTextures.tsx exists for direct import backwards compatibility only

// Low-level texture utilities (prefer useTextures hook instead)
export { createTextureOperations, type TextureOperations } from './utils'

// PostProcessing - WebGPU post-processing management
// Types are declared globally in types/postprocessing.d.ts
export { usePostProcessing } from './usePostProcessing'
