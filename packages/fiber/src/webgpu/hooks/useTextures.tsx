/**
 * Re-export from core - useTextures is now a core R3F hook.
 *
 * This file maintains backwards compatibility for existing webgpu imports.
 */
export { useTextures, type TextureEntry, type UseTexturesReturn } from '../../core/hooks/useTextures'

// Backwards compatibility alias for TSL-specific terminology
export type { TextureEntry as TextureNode } from '../../core/hooks/useTextures'

export default useTextures
import { useTextures } from '../../core/hooks/useTextures'
