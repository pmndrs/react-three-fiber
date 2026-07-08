import type * as THREE from '#three'
import type { BackgroundProp, BackgroundConfig } from '#types'
import type { EnvironmentProps } from '../components/Environment/Environment'
import { presetsObj } from '../components/Environment/environment-assets'

// NOTE: intentionally NOT re-exported from ./index — this is an internal helper.
// Keeping it out of the barrel avoids leaking it into the public package API.

/**
 * Parse the Canvas `background` prop into Environment-compatible props.
 *
 * Detection order for string values: preset name → URL / file path → CSS color.
 * Returns `null` when no background is set.
 */
export function parseBackground(background: BackgroundProp | undefined): EnvironmentProps | null {
  if (!background) return null

  // Object form - pass through with mapping
  if (typeof background === 'object' && !(background as any).isColor) {
    const { backgroundMap, envMap, files, preset, ...rest } = background as BackgroundConfig
    return {
      ...rest,
      preset,
      files: envMap || files,
      backgroundFiles: backgroundMap,
      background: true,
    }
  }

  // Number = hex color
  if (typeof background === 'number') {
    return { color: background, background: true }
  }

  // String - detect type
  if (typeof background === 'string') {
    // Preset?
    if (background in presetsObj) {
      return { preset: background as keyof typeof presetsObj, background: true }
    }
    // URL pattern (prefix) or image extension (suffix)?
    if (/^(https?:\/\/|\/|\.\/|\.\.\/)|\.(hdr|exr|jpg|jpeg|png|webp|gif)$/i.test(background)) {
      return { files: background, background: true }
    }
    // Default to color
    return { color: background, background: true }
  }

  // THREE.Color instance
  if ((background as any).isColor) {
    return { color: background as THREE.ColorRepresentation, background: true }
  }

  return null
}
