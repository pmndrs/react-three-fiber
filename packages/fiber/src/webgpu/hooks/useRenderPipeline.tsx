import { useLayoutEffect, useEffect, useRef, useCallback, useState } from 'react'
import { useStore, useThree } from '../../core/hooks'
import * as THREE from '#three'
import { pass } from '#three/tsl'

// Types are declared globally in types/renderPipeline.d.ts:
// - PassRecord
// - RenderPipelineCallbackState
// - RenderPipelineSetupCallback
// - RenderPipelineMainCallback
// - UseRenderPipelineReturn

//* Hook Implementation ==============================

/**
 * Hook for managing WebGPU RenderPipeline with automatic scenePass setup.
 *
 * Features:
 * - Creates RenderPipeline instance if not exists
 * - Creates default scenePass (no MRT) automatically
 * - Callbacks receive full RootState for flexibility
 * - No auto-cleanup on unmount - use reset() for explicit cleanup
 * - Scene/camera changes trigger scenePass recreation
 * - A replaced scenePass is disposed once the new graph is installed, so rebuild() does not
 *   strand its render target (and MRT attachments) on the GPU
 * - Any run that changes the output node sets RenderPipeline.needsUpdate, so rebuild() actually
 *   recompiles instead of silently keeping the first compiled graph
 *
 * @param mainCB - Main callback to configure outputNode and create effect passes
 * @param setupCB - Optional setup callback to configure MRT on scenePass
 * @returns { passes, renderPipeline, clearPasses, reset, rebuild }
 *
 * @example
 * ```tsx
 * // Simple effect
 * useRenderPipeline(({ renderPipeline, passes }) => {
 *   renderPipeline.outputNode = bloom(passes.scenePass.getTextureNode())
 * })
 *
 * // With MRT setup
 * useRenderPipeline(
 *   ({ renderPipeline, passes }) => {
 *     const beauty = passes.scenePass.getTextureNode().toInspector('Color')
 *     const vel = passes.scenePass.getTextureNode('velocity')
 *     renderPipeline.outputNode = motionBlur(beauty, vel)
 *   },
 *   ({ passes }) => {
 *     passes.scenePass.setMRT(mrt({ output, velocity }))
 *   }
 * )
 *
 * // Read-only access
 * const { renderPipeline, passes } = useRenderPipeline()
 * ```
 */
export function useRenderPipeline(
  mainCB?: RenderPipelineMainCallback,
  setupCB?: RenderPipelineSetupCallback,
): UseRenderPipelineReturn {
  const store = useStore()
  const { scene, camera, renderer, isLegacy } = useThree()

  // Track if callbacks have been run for the current render-pipeline instance
  // Reset on mount via useEffect to support HMR (see below)
  const callbacksRanRef = useRef(false)

  // Track the scene/camera used for the current scenePass to avoid unnecessary recreation
  // Recreating scenePass triggers TSL node graph rebuild which can corrupt SkinningNode refs
  const scenePassCacheRef = useRef<{ sceneUuid: string; cameraUuid: string; scenePass: any } | null>(null)

  // Force scenePass recreation on the next effect run, without dropping the reference to the
  // outgoing pass. Clearing scenePassCacheRef directly would strand it: three does not free
  // render-target GPU memory on JS garbage collection, and once the ref is gone neither we nor
  // the app can dispose it. Keeping the ref lets the effect dispose it after the swap. See #3854.
  const forceScenePassRebuildRef = useRef(false)

  // Store callbacks in refs to avoid useEffect re-running on every render
  // (inline callbacks get new references each render)
  const mainCBRef = useRef(mainCB)
  const setupCBRef = useRef(setupCB)
  mainCBRef.current = mainCB
  setupCBRef.current = setupCB

  // Rebuild trigger - increment to force effect re-run
  const [rebuildVersion, setRebuildVersion] = useState(0)

  // HMR fix: Reset callback tracking on mount so callbacks re-run after hot reload
  // React preserves component identity during HMR but refs keep stale values
  useEffect(() => {
    callbacksRanRef.current = false
    // Flag rather than clearing the cache: this runs *after* the layout effect has already
    // created and installed a scenePass, so dropping the ref here would leak exactly the pass
    // that is currently live. The flag makes the next run recreate and dispose it properly.
    forceScenePassRebuildRef.current = true
  }, [])

  //* Cleanup Functions ==============================

  const clearPasses = useCallback(() => {
    store.setState({ passes: {} })
  }, [store])

  const reset = useCallback(() => {
    store.setState({
      renderPipeline: null,
      passes: {},
    })
    // Safe to dispose synchronously here: the pipeline is torn down in the same tick, so nothing
    // is left referencing the pass. This is explicit user-requested cleanup.
    scenePassCacheRef.current?.scenePass?.dispose?.()
    callbacksRanRef.current = false
    scenePassCacheRef.current = null
    forceScenePassRebuildRef.current = false
  }, [store])

  // Force re-run of setup/main callbacks with current closure values
  const rebuild = useCallback(() => {
    callbacksRanRef.current = false // Allow callbacks to run again
    // Deliberately NOT disposing here. The pipeline keeps rendering the current graph until the
    // layout effect swaps it, so disposing now would leave the live graph pointing at a freed
    // render target. The effect disposes the outgoing pass once the new one is installed.
    forceScenePassRebuildRef.current = true // Force new scenePass
    setRebuildVersion((v) => v + 1)
  }, [])

  //* Main Effect - Setup RenderPipeline ==============================
  // useLayoutEffect runs synchronously BEFORE browser paint
  // This ensures MRT is configured before the first render frame

  useLayoutEffect(() => {
    // WebGPU only - throw if used with WebGL
    if (isLegacy) {
      throw new Error('useRenderPipeline is only available with WebGPU renderer. Set renderer prop on Canvas.')
    }

    if (!renderer || !scene || !camera) return

    const state = store.getState()
    const set = store.setState

    try {
      let pipeline = state.renderPipeline
      let currentPasses = { ...state.passes } as PassRecord

      //* Create RenderPipeline if needed ==============================
      let justCreatedPipeline = false
      if (!pipeline) {
        pipeline = new THREE.RenderPipeline(renderer as THREE.WebGPURenderer)
        justCreatedPipeline = true
      }

      //* Create/Update default scenePass ==============================
      // Only recreate scenePass if scene/camera actually changed
      // Unnecessary recreation triggers TSL node graph rebuild which corrupts SkinningNode refs
      const cacheValid =
        !forceScenePassRebuildRef.current &&
        scenePassCacheRef.current &&
        scenePassCacheRef.current.sceneUuid === scene.uuid &&
        scenePassCacheRef.current.cameraUuid === camera.uuid

      // The pass being replaced, if any. Disposed at the end of this effect, once the new graph
      // is installed -- never before, or the pipeline would render against a freed target.
      let outgoingScenePass: any = null

      let scenePass
      if (cacheValid) {
        scenePass = scenePassCacheRef.current!.scenePass
      } else {
        outgoingScenePass = scenePassCacheRef.current?.scenePass ?? null
        scenePass = pass(scene, camera)
        scenePassCacheRef.current = { sceneUuid: scene.uuid, cameraUuid: camera.uuid, scenePass }
        forceScenePassRebuildRef.current = false
      }
      currentPasses.scenePass = scenePass

      // Whether the node graph changed this run and the pipeline must recompile. See #3853.
      let outputNodeChanged = false

      // Set default outputNode (passthrough) if not configured, if we just created the pipeline,
      // or if it still points at the pass we are about to replace. That last case matters when
      // there is no mainCB, or mainCB does not assign outputNode: the default passthrough has to
      // follow the new scenePass, otherwise we would dispose the pass the pipeline still renders.
      if (!pipeline.outputNode || justCreatedPipeline || pipeline.outputNode === outgoingScenePass) {
        pipeline.outputNode = scenePass
        outputNodeChanged = true
      }

      // Update state with the pipeline and initial scenePass
      set({ renderPipeline: pipeline, passes: currentPasses })

      //* Run setupCB and mainCB ==============================
      // Only run callbacks if:
      // 1. The pipeline was just created (first setup)
      // 2. Callbacks haven't run yet for this instance
      // 3. scenePass was just recreated (scene/camera changed)
      // 4. rebuild() was explicitly called
      // Skipping on pure HMR (same scene/camera) prevents TSL corruption
      const shouldRunCallbacks = justCreatedPipeline || !callbacksRanRef.current || !cacheValid

      if (shouldRunCallbacks) {
        //* Run setupCB (MRT configuration) ==============================
        // IMPORTANT: setupCB runs first so MRT is configured before any rendering
        if (setupCBRef.current) {
          const freshState: RenderPipelineCallbackState = Object.assign({}, store.getState(), {
            renderPipeline: pipeline,
            passes: currentPasses,
          })
          const setupResult = setupCBRef.current(freshState)

          if (setupResult && typeof setupResult === 'object') {
            currentPasses = { ...currentPasses, ...setupResult }
            set({ passes: currentPasses })
          }
        }

        //* Run mainCB ==============================
        if (mainCBRef.current) {
          const freshState: RenderPipelineCallbackState = Object.assign({}, store.getState(), {
            renderPipeline: pipeline,
            passes: currentPasses,
          })
          const mainResult = mainCBRef.current(freshState)

          if (mainResult && typeof mainResult === 'object') {
            currentPasses = { ...currentPasses, ...mainResult }
            set({ passes: currentPasses })
          }
        }

        // The callbacks exist to assign pipeline.outputNode (see this hook's own JSDoc examples),
        // so treat any run as a graph change.
        outputNodeChanged = true

        // Mark callbacks as run so we don't re-run on HMR
        callbacksRanRef.current = true
      }

      // three's RenderPipeline only recompiles its present-quad material inside _update() when
      // needsUpdate is true, and documents the property as "Must be set to true when the output
      // node changes." It starts true on construction, so the FIRST graph compiled fine and every
      // later assignment -- i.e. everything driven by rebuild() -- was silently ignored: the
      // callbacks ran, the assignment happened, the GPU never saw it. See #3853.
      if (outputNodeChanged) pipeline.needsUpdate = true

      // Now that the new graph is installed and compiled, the replaced pass is unreachable.
      // three does not free render-target GPU memory on GC, so without this every rebuild()
      // stranded a full-screen target per MRT attachment. See #3854.
      if (outgoingScenePass && outgoingScenePass !== scenePass) outgoingScenePass.dispose?.()
    } catch (error) {
      // Surfaced rather than rethrown: throwing here would take down the whole tree for what is
      // usually a recoverable pass-configuration mistake. Logged loudly so a failed pipeline
      // setup cannot look like "the effect silently did nothing".
      console.warn('[useRenderPipeline] Setup failed; the render pipeline was not configured:', error)
    }

    // No auto-cleanup on unmount - RenderPipeline persists
  }, [store, renderer, scene, camera, isLegacy, rebuildVersion]) // Callbacks accessed via refs; rebuildVersion triggers manual re-run

  //* Return current state ==============================

  // Subscribe to state changes for reactive updates
  const passes = useThree((s) => s.passes)
  const renderPipeline = useThree((s) => s.renderPipeline)

  return {
    passes,
    renderPipeline,
    clearPasses,
    reset,
    rebuild,
    // isReady indicates if RenderPipeline is configured and ready for rendering
    isReady: renderPipeline !== null,
  }
}

export default useRenderPipeline
