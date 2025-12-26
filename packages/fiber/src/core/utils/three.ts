import * as THREE from '#three'
import type { Dpr, Size, ThreeCamera } from '#types'
import { isOrthographicCamera } from './is'

//* Three.js Utilities ==============================
// Three.js-specific utility functions

/**
 * Calculates the device pixel ratio for rendering.
 * Handles array DPR ranges [min, max] to clamp devicePixelRatio.
 *
 * @param dpr - Target DPR value or [min, max] range
 * @returns Calculated DPR value
 *
 * @example
 * calculateDpr(2) // => 2
 * calculateDpr([1, 2]) // => clamps window.devicePixelRatio between 1 and 2
 */
export function calculateDpr(dpr: Dpr): number {
  // Err on the side of progress by assuming 2x dpr if we can't detect it
  // This will happen in workers where window is defined but dpr isn't.
  const target = typeof window !== 'undefined' ? window.devicePixelRatio ?? 2 : 1
  return Array.isArray(dpr) ? Math.min(Math.max(dpr[0], target), dpr[1]) : dpr
}

/**
 * Extracts the first segment of a UUID string (before the first hyphen).
 * Used for creating unique material names when duplicates exist.
 *
 * @param uuid - UUID string to extract prefix from
 * @returns First segment of the UUID
 *
 * @example
 * getUuidPrefix('a1b2c3d4-e5f6-g7h8-i9j0') // => 'a1b2c3d4'
 */
export function getUuidPrefix(uuid: string): string {
  return uuid.split('-')[0]
}

/**
 * Updates camera projection based on viewport size.
 * Adjusts aspect ratio for perspective cameras or bounds for orthographic cameras.
 * Respects camera.manual flag - manual cameras are not modified.
 *
 * @param camera - Camera to update
 * @param size - Current viewport size
 */
export function updateCamera(camera: ThreeCamera, size: Size): void {
  // Do not mess with the camera if it belongs to the user
  // https://github.com/pmndrs/react-three-fiber/issues/92
  if (camera.manual) return

  if (isOrthographicCamera(camera)) {
    camera.left = size.width / -2
    camera.right = size.width / 2
    camera.top = size.height / 2
    camera.bottom = size.height / -2
  } else {
    camera.aspect = size.width / size.height
  }

  camera.updateProjectionMatrix()
}
