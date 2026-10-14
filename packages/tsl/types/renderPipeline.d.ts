/**
 * RenderPipeline Types for useRenderPipeline hook (WebGPU only)
 */

import type { CreatorState } from '../src/internal/ScopedStore'

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
   *
   * The index signature admits `undefined` because a key may simply not be registered, and
   * because the optional `scenePass` must be assignable to it: under `skipLibCheck: false` an
   * optional property whose type excludes `undefined` from the index signature is an error
   * (TS2411) for every consumer compiling these declarations.
   */
  interface PassRecord {
    scenePass?: ScenePassNode
    [key: string]: import('three/webgpu').Node | undefined
  }

  /**
   * State passed to pipeline callbacks after the active pipeline has been created.
   *
   * The same state `useNodes` / `useLocalNodes` creators get: `uniforms`, `nodes`, `buffers`,
   * `gpuStorage` and `textures` are the wrapped views, entries staged earlier in the render
   * included. Reads through them are tracked, so a read resource that appears, is replaced or is
   * removed re-runs the callbacks.
   *
   * `passes.scenePass` is required here: the hook installs the default scene pass before either
   * callback runs, so callbacks can use it without a guard or a cast.
   *
   * `renderer` is narrowed to `WebGPURenderer` and `isLegacy` to `false`: the hook throws under
   * the legacy renderer before either callback can run, so a callback never sees WebGL.
   */
  type RenderPipelineCallbackState = CreatorState & {
    renderPipeline: ThreeRenderPipeline
    passes: PassRecord & { scenePass: ScenePassNode }
    renderer: import('three/webgpu').WebGPURenderer
    isLegacy: false
  }

  /**
   * What a callback may return to register entries into `state.passes`.
   *
   * `scenePass` is reserved. The hook owns that entry and its lifecycle: it caches the pass it
   * created, and `rebuild()`, `reset()` and unmount dispose that cached pass. A callback overwriting the
   * store entry would leave the store pointing at a node the hook never disposes, and the hook
   * disposing a pass nothing references. So returning it is a type error.
   */
  type RegisteredPasses = Record<string, import('three/webgpu').Node> & { scenePass?: never }

  /** Setup callback - runs first to configure MRT, create additional passes */
  type RenderPipelineSetupCallback = (state: RenderPipelineCallbackState) => RegisteredPasses | void

  /** Main callback - runs second to configure outputNode, create effect passes */
  type RenderPipelineMainCallback = (state: RenderPipelineCallbackState) => RegisteredPasses | void

  /** Options for a configuring useRenderPipeline call */
  interface RenderPipelineOptions {
    /**
     * Keep the pipeline rendering after the component unmounts, until another component configures
     * the canvas's pipeline, `reset()`, or the canvas unmounts. Off by default: an owner frees its
     * pipeline and scene pass when it unmounts. A remount is a new owner with a new pipeline either way.
     */
    persist?: boolean
  }

  /** The imperative half of useRenderPipeline's return value, present in every state */
  interface UseRenderPipelineActions {
    /** Current passes from state */
    passes: PassRecord
    /** Clear the passes record. From a reader, acts on the pipeline that is rendering. */
    clearPasses: () => void
    /**
     * Free the pipeline and its scene pass now. The previous owner takes over, or the canvas
     * goes back to plain rendering. From a reader, acts on the pipeline that is rendering.
     */
    reset: () => void
    /**
     * Re-run setup/main callbacks with current closure values, against a fresh scene pass. From
     * a reader, rebuilds the pipeline that is rendering.
     */
    rebuild: () => void
  }

  /**
   * Return type for useRenderPipeline hook, discriminated on `isReady`.
   *
   * `if (isReady)` narrows `renderPipeline` to non-null, which is what the docs already tell
   * callers to check. `passes.scenePass` deliberately stays optional in the ready branch:
   * `clearPasses()` empties the record while leaving the pipeline in place.
   */
  type UseRenderPipelineReturn = UseRenderPipelineActions &
    (
      | {
          /** True when RenderPipeline is configured and ready */
          isReady: true
          /** RenderPipeline instance */
          renderPipeline: ThreeRenderPipeline
        }
      | {
          /** False until a configuring call has created the pipeline */
          isReady: false
          /** No owner yet, or torn down by reset() or the owner unmounting */
          renderPipeline: null
        }
    )
}
