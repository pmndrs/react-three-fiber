/**
 * RenderPipeline Types for useRenderPipeline hook (WebGPU only)
 */

import type { RootState } from './store'

declare global {
  /**
   * three's own render pipeline type. Named here so the rest of R3F refers to three's shape
   * rather than `any`. three r183 renamed `PostProcessing` to `RenderPipeline`; our peer floor
   * is r185, so the new name is the only one.
   */
  type ThreeRenderPipeline = import('three/webgpu').RenderPipeline

  /** Pass record - stores TSL pass nodes for render pipeline */
  type PassRecord = Record<string, any>

  /** Setup callback - runs first to configure MRT, create additional passes */
  type RenderPipelineSetupCallback = (state: RootState) => PassRecord | void

  /** Main callback - runs second to configure outputNode, create effect passes */
  type RenderPipelineMainCallback = (state: RootState) => PassRecord | void

  /** Return type for useRenderPipeline hook */
  interface UseRenderPipelineReturn {
    /** Current passes from state */
    passes: PassRecord
    /** RenderPipeline instance (null if not initialized) */
    renderPipeline: ThreeRenderPipeline | null
    /** Clear all passes from state */
    clearPasses: () => void
    /** Reset RenderPipeline entirely (clears PP + passes) */
    reset: () => void
    /** Re-run setup/main callbacks with current closure values */
    rebuild: () => void
    /** True when RenderPipeline is configured and ready */
    isReady: boolean
  }
}
