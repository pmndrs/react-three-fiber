import { catalogue } from '../reconciler'
import { Renderer } from '../store'

/**
 * Returns `true` with correct TS type inference if an object has a configurable color space (since r152).
 */
export const hasColorSpace = <
  T extends Renderer | THREE.Texture | object,
  P = T extends Renderer ? { outputColorSpace: string } : { colorSpace: string },
>(
  object: T,
): object is T & P => 'colorSpace' in object || 'outputColorSpace' in object

export type ColorManagementRepresentation = { enabled: boolean | never } | { legacyMode: boolean | never }

/**
 * The current THREE.ColorManagement instance, if present.
 */
export const getColorManagement = (): ColorManagementRepresentation | null => (catalogue as any).ColorManagement ?? null
