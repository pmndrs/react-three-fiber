/** Renderer creation and resource release. Root lifetime decides when release is safe. */
import * as THREE from 'three'
import type { DefaultGLProps, GLProps } from './configuration'
import type { Renderer } from './store'
import { isPromiseLike } from './utils/promise'

export const isRenderer = (def: any) => !!def?.render

/** The renderer to configure, or a promise for one from an async factory */
export function createRenderer(canvas: DefaultGLProps['canvas'], gl?: GLProps): Renderer | PromiseLike<Renderer> {
  const defaults: DefaultGLProps = { canvas, powerPreference: 'high-performance', antialias: true, alpha: true }
  if (typeof gl === 'function') return gl(defaults)
  if (isRenderer(gl)) return gl as Renderer
  return new THREE.WebGLRenderer({ ...defaults, ...(gl as object) })
}

/**
 * Frees a renderer R3F built. WebGLRenderer.dispose() releases programs and caches but keeps its
 * context until garbage collection, and browsers cap live WebGL contexts, so the context is lost
 * after it. A WebGPURenderer (from a factory) releases its device and context inside dispose().
 */
function disposeRenderer(gl: THREE.WebGLRenderer): void | Promise<void> {
  // Avoid starting initialization through three's dispose(). A factory must await init()
  // before returning its renderer so readiness includes initialization and teardown can wait.
  if ((gl as { hasInitialized?: () => boolean }).hasInitialized?.() === false) return
  const disposed: unknown = attempt(() => (gl.dispose ? gl.dispose() : gl.renderLists?.dispose?.()))
  // WebGPURenderer.dispose() is async from three r186
  if (isPromiseLike(disposed)) {
    return Promise.resolve(disposed)
      .catch((error) => console.warn('[R3F] Error disposing renderer', error))
      .then(() => attempt(() => gl.forceContextLoss?.()))
  }
  attempt(() => gl.forceContextLoss?.())
}

/** Owned renderers are disposed. Caller-provided renderers release caches and their context. */
export function releaseRenderer(gl: THREE.WebGLRenderer | undefined, owned: boolean): void | Promise<void> {
  if (!gl) return
  if (owned) return disposeRenderer(gl)
  attempt(() => gl.renderLists?.dispose?.())
  attempt(() => gl.forceContextLoss?.())
}

function attempt<T>(step: () => T): T | undefined {
  try {
    return step()
  } catch (error) {
    console.warn('[R3F] Error while unmounting root; teardown may be incomplete:', error)
  }
}
