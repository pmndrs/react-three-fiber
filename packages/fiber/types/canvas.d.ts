import * as React from 'react'
import type { Options as ResizeOptions } from 'react-use-measure'
import type { RenderProps } from './renderer'
import type { Euler, ColorRepresentation, Loader } from 'three'
import type { PresetsType } from '../src/core/components/Environment/environment-assets'

//* Background Types ==============================

/**
 * Expanded object form for background configuration.
 * Allows separate textures for background (visual backdrop) and environment (PBR lighting).
 */
export interface BackgroundConfig {
  /** HDRI preset name: 'apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse' */
  preset?: PresetsType
  /** Files for cube texture (6 faces) or single HDR/EXR */
  files?: string | string[]
  /** Separate files for scene.background (visual backdrop) */
  backgroundMap?: string | string[]
  backgroundRotation?: Euler | [number, number, number]
  backgroundBlurriness?: number
  backgroundIntensity?: number
  /** Separate files for scene.environment (PBR lighting/reflections) */
  envMap?: string | string[]
  environmentRotation?: Euler | [number, number, number]
  environmentIntensity?: number
  path?: string
  extensions?: (loader: Loader) => void
}

/**
 * Background prop type for Canvas.
 *
 * String detection priority:
 * 1. Preset - exact match against known presets (apartment, city, dawn, forest, lobby, night, park, studio, sunset, warehouse)
 * 2. URL - starts with /, ./, ../, http://, https://, OR has image extension
 * 3. Color - default fallback (CSS color names, hex values, rgb(), etc.)
 *
 * @example Color
 * ```tsx
 * <Canvas background="red" />
 * <Canvas background="#ff0000" />
 * <Canvas background={0xff0000} />
 * ```
 *
 * @example Preset
 * ```tsx
 * <Canvas background="city" />
 * ```
 *
 * @example URL
 * ```tsx
 * <Canvas background="/path/to/env.hdr" />
 * <Canvas background="./sky.jpg" />
 * ```
 *
 * @example Object form
 * ```tsx
 * <Canvas background={{
 *   files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'],
 *   backgroundMap: 'path/to/sky.jpg',
 *   envMap: 'path/to/lighting.hdr',
 *   backgroundBlurriness: 0.5,
 * }} />
 * ```
 */
export type BackgroundProp =
  | ColorRepresentation // "red", "#ff0000", 0xff0000
  | string // URL or preset
  | BackgroundConfig // Expanded object form

//* Canvas Types ==============================

export interface CanvasProps
  extends
    Omit<RenderProps<HTMLCanvasElement>, 'size' | 'primaryCanvas' | 'scheduler'>,
    React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  ref?: React.Ref<HTMLCanvasElement>
  /** Canvas fallback content, similar to img's alt prop */
  fallback?: React.ReactNode
  /**
   * Options to pass to useMeasure.
   * @see https://github.com/pmndrs/react-use-measure#api
   */
  resize?: ResizeOptions
  /** The target where events are being subscribed to, default: the div that wraps canvas */
  eventSource?: HTMLElement | React.RefObject<HTMLElement>
  /** The event prefix that is cast into canvas pointer x/y events, default: "offset" */
  eventPrefix?: 'offset' | 'client' | 'page' | 'layer' | 'screen'
  /** Enable/disable automatic HMR refresh for TSL nodes and uniforms, default: true in dev */
  hmr?: boolean
  /** Canvas resolution width in pixels. If omitted, uses container width. */
  width?: number
  /** Canvas resolution height in pixels. If omitted, uses container height. */
  height?: number
  /** Force canvas dimensions to even numbers (fixes Safari rendering issues with odd/fractional sizes) */
  forceEven?: boolean
  /**
   * Scene background configuration.
   * Accepts colors, URLs, presets, or an expanded object for separate background/environment.
   * @see BackgroundProp for full documentation and examples
   */
  background?: BackgroundProp
}
