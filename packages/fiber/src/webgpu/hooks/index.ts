// Uniforms - scoped objects with create-if-not-exists pattern
export {
  useUniform,
  removeUniforms,
  clearScope,
  DEFAULT_SCOPE,
  type UniformNode,
  type UniformRecord,
  type UniformCreator,
} from './useUniforms'

// Nodes - scoped objects with create-if-not-exists pattern
export {
  useNodes,
  removeNodes,
  clearNodeScope,
  DEFAULT_NODE_SCOPE,
  type TSLNode,
  type NodeRecord,
  type NodeCreator,
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
