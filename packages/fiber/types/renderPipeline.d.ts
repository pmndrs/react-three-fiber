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

  /**
   * The pass `useRenderPipeline` creates for you: three's own `PassNode`, as returned by
   * `pass(scene, camera)` from `three/tsl`. Referenced from three so members like
   * `getTextureNode`, `setMRT` and `dispose` track the installed version.
   */
  type ScenePassNode = import('three/webgpu').PassNode

  /**
   * Pass record - stores TSL pass nodes for render pipeline.
   *
   * `scenePass` is the only key the library owns. It is optional here because this is also the
   * shape of `state.passes`, which is `{}` before the pipeline exists and again after `reset()`
   * or `clearPasses()`. Inside the callbacks it is always present; see
   * {@link RenderPipelineCallbackState}.
   *
   * Every other key is user-registered, via a callback's return value. Those are TSL nodes of
   * any kind, not only passes: texture reads of an MRT attachment, effect nodes, extra
   * `pass()` instances. `Node` is the common base, so that is the bound. Narrow at the call
   * site when you need a member, e.g. `passes.velocity as TextureNode`.
   */
  interface PassRecord {
    scenePass?: ScenePassNode
    [key: string]: import('three/webgpu').Node
  }

  /**
   * State passed to pipeline callbacks after the active pipeline has been created.
   *
   * `passes.scenePass` is required here: the hook installs the default scene pass before either
   * callback runs, so callbacks can use it without a guard or a cast.
   */
  type RenderPipelineCallbackState = RootState & {
    renderPipeline: ThreeRenderPipeline
    passes: PassRecord & { scenePass: ScenePassNode }
  }

  /**
   * What a callback may return to register entries into `state.passes`.
   *
   * `scenePass` is reserved. The hook owns that entry and its lifecycle: it caches the pass it
   * created, and `rebuild()` / `reset()` dispose that cached pass. A callback overwriting the
   * store entry would leave the store pointing at a node the hook never disposes, and the hook
   * disposing a pass nothing references. So returning it is a type error.
   */
  type RegisteredPasses = Record<string, import('three/webgpu').Node> & { scenePass?: never }

  /** Setup callback - runs first to configure MRT, create additional passes */
  type RenderPipelineSetupCallback = (state: RenderPipelineCallbackState) => RegisteredPasses | void

  /** Main callback - runs second to configure outputNode, create effect passes */
  type RenderPipelineMainCallback = (state: RenderPipelineCallbackState) => RegisteredPasses | void

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
