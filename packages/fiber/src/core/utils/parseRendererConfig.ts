import type { CanvasProps } from '#types'

// NOTE: intentionally NOT re-exported from ./index — this is an internal helper.
// Keeping it out of the barrel avoids leaking it into the public package API.

/** Scheduler config extracted from a `renderer` config bag. */
export interface RendererScheduler {
  before?: string | string[]
  after?: string | string[]
  order?: number
  fps?: number
}

/** Result of normalizing the Canvas `renderer` prop. */
export interface ParsedRendererConfig {
  /** Multi-canvas target id (WebGPU only), when the prop is a config bag. */
  primaryCanvas: string | undefined
  /** Scheduler config, when the prop is a config bag. */
  scheduler: RendererScheduler | undefined
  /** The renderer value to forward to `configure()`. */
  renderer: CanvasProps['renderer']
}

/**
 * Normalize the Canvas `renderer` prop.
 *
 * The prop is overloaded: it can be a boolean shorthand, an actual renderer
 * instance/factory (has a `render` method), a plain renderer-options object, or
 * a "config bag" that additionally carries multi-canvas / scheduler metadata
 * (`primaryCanvas` / `scheduler`).
 *
 * Only a config bag (an object, non-null, without a `render` method, that
 * contains `primaryCanvas` or `scheduler`) is split apart. In that case the
 * `primaryCanvas` / `scheduler` keys are peeled off; the remaining renderer
 * options become `renderer` — or, when nothing else remains, the original prop
 * is passed through so downstream defaults still apply.
 *
 * Anything else (boolean, renderer instance, plain options object, or
 * `undefined`) is passed through untouched.
 */
export function parseRendererConfig(rendererProp: CanvasProps['renderer']): ParsedRendererConfig {
  const isRendererConfig =
    typeof rendererProp === 'object' &&
    rendererProp !== null &&
    !('render' in rendererProp) &&
    ('primaryCanvas' in rendererProp || 'scheduler' in rendererProp)

  if (isRendererConfig) {
    const { primaryCanvas: pc, scheduler: sc, ...rest } = rendererProp as Record<string, unknown>
    return {
      primaryCanvas: pc as string | undefined,
      scheduler: sc as RendererScheduler | undefined,
      renderer: (Object.keys(rest).length > 0 ? rest : rendererProp) as CanvasProps['renderer'],
    }
  }

  return { primaryCanvas: undefined, scheduler: undefined, renderer: rendererProp }
}
