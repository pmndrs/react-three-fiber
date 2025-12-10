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

// Textures - Map with URL keys, CRUD operations
export { useTextures, type TextureNode, type UseTexturesReturn } from './useTextures'

// Texture utilities
export { createTextureOperations, type TextureOperations } from './utils'
