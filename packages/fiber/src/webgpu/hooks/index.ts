// Uniforms - root-level + scoped with create-if-not-exists pattern
// Note: UniformNode and UniformRecord are global types from types/tsl.d.ts
export { useUniforms, removeUniforms, clearScope, clearRootUniforms, type UniformCreator } from './useUniforms'

// Single uniform - simple create/get/update API
export { useUniform, type UniformValue } from './useUniform'

// Nodes - root-level + scoped with create-if-not-exists pattern
export {
  useNodes,
  useLocalNodes,
  removeNodes,
  clearNodeScope,
  clearRootNodes,
  type TSLNode,
  type NodeRecord,
  type NodeCreator,
  type LocalNodeCreator,
} from './useNodes'

// Textures - Re-exported from core (useTextures is now a core R3F hook)
export {
  useTextures,
  type TextureEntry,
  type TextureNode, // Backwards compat alias
  type UseTexturesReturn,
} from './useTextures'

// Low-level texture utilities (prefer useTextures hook instead)
export { createTextureOperations, type TextureOperations } from './utils'

// PostProcessing - WebGPU post-processing management
// Types are declared globally in types/postprocessing.d.ts
export { usePostProcessing } from './usePostProcessing'
