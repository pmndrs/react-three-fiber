/**
 * PostProcessing Types for usePostProcessing hook (WebGPU only)
 */

import type { RootState } from './store'

declare global {
  /** Pass record - stores TSL pass nodes for post-processing */
  type PassRecord = Record<string, any>

  /** Setup callback - runs first to configure MRT, create additional passes */
  type PostProcessingSetupCallback = (state: RootState) => PassRecord | void

  /** Main callback - runs second to configure outputNode, create effect passes */
  type PostProcessingMainCallback = (state: RootState) => PassRecord | void

  /** Return type for usePostProcessing hook */
  interface UsePostProcessingReturn {
    /** Current passes from state */
    passes: PassRecord
    /** PostProcessing instance (null if not initialized) */
    postProcessing: any | null // THREE.PostProcessing
    /** Clear all passes from state */
    clearPasses: () => void
    /** Reset PostProcessing entirely (clears PP + passes) */
    reset: () => void
    /** Re-run setup/main callbacks with current closure values */
    rebuild: () => void
    /** True when PostProcessing is configured and ready */
    isReady: boolean
  }
}
