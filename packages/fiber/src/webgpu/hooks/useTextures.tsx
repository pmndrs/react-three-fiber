/**
 * Re-export from core - useTextures is now a core R3F hook (a reactive Texture registry).
 *
 * This file maintains backwards compatibility for existing webgpu imports.
 */
import { useTextures } from '../../core/hooks/useTextures'
import type { Texture as _Texture } from '#three'

export {
  useTextures,
  type TextureInput,
  type TextureResult,
  type UseTexturesReturn,
} from '../../core/hooks/useTextures'

/**
 * @deprecated The registry now stores plain `Texture` objects, not TSL nodes. Use `Texture` directly.
 * Kept as an alias for backwards compatibility.
 */
export type TextureEntry = _Texture
/**
 * @deprecated The registry now stores plain `Texture` objects, not TSL nodes. Use `Texture` directly.
 * Kept as an alias for backwards compatibility.
 */
export type TextureNode = _Texture

export default useTextures
