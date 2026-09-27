// The TSL resource hooks (useUniforms, useNodes, useBuffers, useGPUStorage, useRenderPipeline)
// live in @react-three/tsl. What remains here is the texture registry, which is core.

// Textures - Re-exported from core (useTextures is now a core R3F hook)
// Note: the runtime bindings are not re-exported here to avoid duplicate exports, since ../core
// already exports them. The file ./useTextures.tsx exists for direct import backwards
// compatibility only. The two aliases below are type-only, so they add no runtime export and
// cannot collide — they are re-exported so consumers (notably @react-three/test-renderer/webgpu)
// can name these types without reaching into fiber's source tree.
export type { TextureEntry, TextureNode } from './useTextures'

// Low-level texture utilities (prefer useTextures hook instead)
export { createTextureOperations, type TextureOperations } from '../../core/utils/textures'
