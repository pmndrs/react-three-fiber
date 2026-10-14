import { useLayoutEffect, useEffect, useMemo, useRef, useCallback, useState, useSyncExternalStore } from 'react'
import { useStore, useThree } from '@react-three/fiber/extension'
import * as THREE from 'three/webgpu'
import { pass } from 'three/tsl'
import { usePrimaryStore, usePrimaryThree } from './internal/usePrimaryStore'
import { createLazyCreatorState, createResourceView } from './internal/ScopedStore'
import { createReadTracker, isTrackerStale, type ReadTracker } from './internal/readTracking'
import {
  activeOwner,
  claimOwnership,
  createOwner,
  disposeOwnerResources,
  publishOwner,
  releaseOwner,
  scheduleRelease,
  type PipelineOwner,
} from './internal/renderPipelineOwners'

/** Stable empty record for `passes` before a pipeline exists, so readers don't re-render on it. */
const NO_PASSES: PassRecord = Object.freeze({}) as PassRecord

// Types are declared globally in types/renderPipeline.d.ts:
// - ScenePassNode
// - PassRecord
// - RegisteredPasses
// - RenderPipelineCallbackState
// - RenderPipelineSetupCallback
// - RenderPipelineMainCallback
// - RenderPipelineOptions
// - UseRenderPipelineActions
// - UseRenderPipelineReturn

//* Hook Implementation ==============================

/**
 * Hook for managing WebGPU RenderPipeline with automatic scenePass setup.
 *
 * Features:
 * - A call with a callback owns the canvas's pipeline: it creates the pipeline and a default
 *   scenePass (no MRT), and frees both when it unmounts (opt out with `persist`)
 * - A call without callbacks only reads: it never creates, keeps alive or frees the pipeline
 * - The most recently mounted owner renders; when it unmounts, the previous owner takes over again
 * - StrictMode and Fast Refresh remounts reuse the graph instead of rebuilding it
 * - Callbacks receive the same state as creators (`uniforms`, `nodes`, ... wrapped, including
 *   entries staged earlier in the render), and their reads are tracked as in useLocalNodes: a read
 *   resource that appears, is replaced or is removed re-runs them
 * - Callbacks re-run on a hot update (`_hmrVersion`), on scene/camera change and on rebuild()
 * - A replaced scenePass is disposed once the new graph is installed, so rebuild() does not
 *   strand its render target (and MRT attachments) on the GPU
 * - Any run that changes the output node sets RenderPipeline.needsUpdate, so rebuild() actually
 *   recompiles instead of silently keeping the first compiled graph
 *
 * @param mainCB - Main callback to configure outputNode and create effect passes
 * @param setupCB - Optional setup callback to configure MRT on scenePass
 * @param options - `persist: true` keeps the pipeline after the component unmounts
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
  options?: RenderPipelineOptions,
): UseRenderPipelineReturn {
  // The pipeline is per canvas; the TSL resources the callbacks read live on the primary store
  const store = useStore()
  const primary = usePrimaryStore()
  const view = useMemo(() => createResourceView(primary, store), [primary, store])
  const { scene, camera, renderer, isLegacy } = useThree()
  const hmrVersion = usePrimaryThree((s) => s._hmrVersion)
  const isOwner = mainCB !== undefined || setupCB !== undefined

  // Track if callbacks have been run against the owner's current pipeline
  const callbacksRanRef = useRef(false)

  // Force scenePass recreation on the next effect run, without dropping the reference to the
  // outgoing pass: the effect disposes it after the swap. See #3854.
  const forceScenePassRebuildRef = useRef(false)

  // Store callbacks and options in refs to avoid the effect re-running on every render
  // (inline callbacks get new references each render)
  const mainCBRef = useRef(mainCB)
  const setupCBRef = useRef(setupCB)
  const persistRef = useRef(options?.persist ?? false)
  mainCBRef.current = mainCB
  setupCBRef.current = setupCB
  persistRef.current = options?.persist ?? false

  // Rebuild trigger - increment to force effect re-run
  const [rebuildVersion, setRebuildVersion] = useState(0)

  // Re-run the callbacks, optionally against a fresh scenePass
  const rerun = useCallback((freshScenePass: boolean) => {
    callbacksRanRef.current = false
    if (freshScenePass) forceScenePassRebuildRef.current = true
    setRebuildVersion((v) => v + 1)
  }, [])

  // This call's ownership record. Created on first use and kept across StrictMode/Fast Refresh
  // remounts, which is what lets a remount reuse the graph.
  const ownerRef = useRef<PipelineOwner | null>(null)

  //* Actions ==============================
  // An owner acts on its own pipeline; a reader acts on whichever owner is rendering.

  const target = useCallback(() => (isOwner ? ownerRef.current : activeOwner(store)) ?? null, [isOwner, store])

  const clearPasses = useCallback(() => {
    const owner = target()
    if (!owner) return
    owner.passes = {}
    if (activeOwner(store) === owner) store.setState({ passes: {} })
  }, [store, target])

  const reset = useCallback(() => {
    const owner = target()
    if (!owner) return
    // Safe to dispose synchronously: releasing hands rendering over (or back to renderer.render())
    // before freeing, so nothing is left rendering against the freed pipeline.
    releaseOwner(owner)
    // A torn-down pipeline is not rebuilt by a resource it once read
    if (owner === ownerRef.current) committedReads.current = null
  }, [target])

  // Force re-run of setup/main callbacks with current closure values
  const rebuild = useCallback(() => {
    if (isOwner) rerun(true)
    else activeOwner(store)?.rebuild()
  }, [isOwner, rerun, store])

  //* Hot Updates ==============================
  // A hot update or a rebuild*() bumps _hmrVersion and the TSL creators register a fresh
  // generation of uniforms and nodes in their layout effects. A graph built from the old
  // generation would keep reading replaced uniforms, so re-run the callbacks -- from a passive
  // effect, which runs after every layout effect of the commit has registered the new one. The
  // scenePass is kept: only the graph built on it changes.

  const hmrVersionRef = useRef(hmrVersion)
  useEffect(() => {
    if (hmrVersionRef.current === hmrVersion) return
    hmrVersionRef.current = hmrVersion
    if (isOwner) rerun(false)
  }, [hmrVersion, isOwner, rerun])

  //* Tracked Reads ==============================
  // As in useLocalNodes: the reads of the last callback run, and a version that changes when one of
  // them would now see something else -- a uniform a parent registers after this component's layout
  // effect ran, or one a rebuild replaced. Unrelated store updates leave it as it is.

  const committedReads = useRef<ReadTracker | null>(null)
  const readsVersion = useRef(0)
  const getReadsVersion = () => {
    const tracker = committedReads.current
    if (tracker && !tracker.stale && isTrackerStale(tracker, view)) readsVersion.current++
    return readsVersion.current
  }
  const subscribe = useCallback(
    (onChange: () => void) => {
      const unsubscribe = primary.subscribe(onChange)
      if (store === primary) return unsubscribe
      const unsubscribeLocal = store.subscribe(onChange)
      return () => {
        unsubscribe()
        unsubscribeLocal()
      }
    },
    [primary, store],
  )
  const resourceVersion = useSyncExternalStore(subscribe, getReadsVersion, getReadsVersion)
  const lastResourceVersion = useRef(resourceVersion)

  //* Main Effect - Setup RenderPipeline ==============================
  // useLayoutEffect runs synchronously BEFORE browser paint
  // This ensures MRT is configured before the first render frame

  useLayoutEffect(() => {
    // WebGPU only - throw if used with WebGL
    if (isLegacy) {
      throw new Error('useRenderPipeline is only available with WebGPU renderer. Set renderer prop on Canvas.')
    }

    // Readers only subscribe (below)
    if (!isOwner) return
    if (!renderer || !scene || !camera) return

    // Narrow the renderer union to WebGPURenderer. `isLegacy` above is the user-facing check;
    // this one is what lets the type system follow. Only reachable if the two disagree.
    if (!('isWebGPURenderer' in renderer)) {
      throw new Error('useRenderPipeline: renderer is not a WebGPURenderer but isLegacy is false.')
    }

    let owner = ownerRef.current
    if (owner && owner.store !== store) {
      releaseOwner(owner)
      owner = null
    }
    if (!owner) owner = ownerRef.current = createOwner(store, () => rerun(true))
    claimOwnership(owner)
    const currentOwner = owner

    try {
      //* Create RenderPipeline if needed ==============================
      // A pipeline is bound to its renderer, so a new renderer means a new pipeline
      let justCreatedPipeline = false
      if (!owner.pipeline || owner.pipeline.renderer !== renderer) {
        disposeOwnerResources(owner)
        owner.pipeline = new THREE.RenderPipeline(renderer)
        justCreatedPipeline = true
      }
      const pipeline = owner.pipeline

      //* Create/Update default scenePass ==============================
      // Only recreate scenePass if scene/camera actually changed
      // Unnecessary recreation triggers TSL node graph rebuild which corrupts SkinningNode refs
      const cached = owner.scenePass
      const cacheValid =
        !forceScenePassRebuildRef.current &&
        cached !== null &&
        cached.sceneUuid === scene.uuid &&
        cached.cameraUuid === camera.uuid

      // The pass being replaced, if any. Disposed at the end of this effect, once the new graph
      // is installed -- never before, or the pipeline would render against a freed target.
      let outgoingScenePass: ScenePassNode | null = null

      let scenePass: ScenePassNode
      if (cacheValid && cached) {
        scenePass = cached.node
      } else {
        outgoingScenePass = cached?.node ?? null
        scenePass = pass(scene, camera)
        owner.scenePass = { sceneUuid: scene.uuid, cameraUuid: camera.uuid, node: scenePass }
        forceScenePassRebuildRef.current = false
      }

      // Whether the node graph changed this run and the pipeline must recompile. See #3853.
      let outputNodeChanged = false

      // Set default outputNode (passthrough) if not configured, if we just created the pipeline,
      // or if it still points at the pass we are about to replace. That last case matters when
      // mainCB does not assign outputNode: the default passthrough has to follow the new
      // scenePass, otherwise we would dispose the pass the pipeline still renders.
      if (!pipeline.outputNode || justCreatedPipeline || pipeline.outputNode === outgoingScenePass) {
        pipeline.outputNode = scenePass
        outputNodeChanged = true
      }

      //* Run setupCB and mainCB ==============================
      // Only run callbacks if:
      // 1. The pipeline was just created (first setup, or after reset())
      // 2. They were asked to re-run: rebuild() or a hot update
      // 3. scenePass was just recreated (scene/camera changed)
      // 4. A resource they read has appeared, been replaced or been removed
      // A plain remount (StrictMode, Fast Refresh) runs none of these and keeps the graph
      const readsChanged = lastResourceVersion.current !== resourceVersion
      lastResourceVersion.current = resourceVersion
      const shouldRunCallbacks = justCreatedPipeline || !callbacksRanRef.current || !cacheValid || readsChanged

      if (shouldRunCallbacks) {
        // Each run registers its passes from scratch, so a pass a callback stops returning is
        // dropped from the record rather than carried over
        let currentPasses: PassRecord = { scenePass }
        owner.passes = currentPasses

        // One tracker for both callbacks: the graph depends on what either of them read
        const tracker = createReadTracker('useRenderPipeline')
        const callbackState = (): RenderPipelineCallbackState =>
          Object.assign(
            createLazyCreatorState(store.getState(), primary, {
              reads: { observe: tracker.observe, nested: true },
              view,
            }),
            { renderPipeline: pipeline, passes: { ...currentPasses, scenePass }, renderer, isLegacy: false as const },
          )

        try {
          //* Run setupCB (MRT configuration) ==============================
          // IMPORTANT: setupCB runs first so MRT is configured before any rendering
          if (setupCBRef.current) {
            const setupResult = setupCBRef.current(callbackState())

            if (setupResult && typeof setupResult === 'object') {
              currentPasses = { ...currentPasses, ...setupResult }
              owner.passes = currentPasses
            }
          }

          //* Run mainCB ==============================
          if (mainCBRef.current) {
            const mainResult = mainCBRef.current(callbackState())

            if (mainResult && typeof mainResult === 'object') {
              currentPasses = { ...currentPasses, ...mainResult }
              owner.passes = currentPasses
            }
          }
        } finally {
          // Also on a throw: a failed run is re-run when what it read changes, like a working one
          tracker.closed = true
          committedReads.current = tracker
        }

        // The callbacks exist to assign pipeline.outputNode (see this hook's own JSDoc examples),
        // so treat any run as a graph change.
        outputNodeChanged = true

        // Mark callbacks as run so a remount doesn't re-run them
        callbacksRanRef.current = true
      }

      // three's RenderPipeline only recompiles its present-quad material inside _update() when
      // needsUpdate is true, and documents the property as "Must be set to true when the output
      // node changes." It starts true on construction, so the FIRST graph compiled fine and every
      // later assignment -- i.e. everything driven by rebuild() -- was silently ignored: the
      // callbacks ran, the assignment happened, the GPU never saw it. See #3853.
      if (outputNodeChanged) pipeline.needsUpdate = true

      publishOwner(owner)

      // Now that the new graph is installed and compiled, the replaced pass is unreachable.
      // three does not free render-target GPU memory on GC, so without this every rebuild()
      // stranded a full-screen target per MRT attachment. See #3854.
      if (outgoingScenePass && outgoingScenePass !== scenePass) outgoingScenePass.dispose()
    } catch (error) {
      // Surfaced rather than rethrown: throwing here would take down the whole tree for what is
      // usually a recoverable pass-configuration mistake. Logged loudly so a failed pipeline
      // setup cannot look like "the effect silently did nothing". Whatever was built before the
      // failure (at least the passthrough) still renders.
      publishOwner(owner)
      console.warn('[useRenderPipeline] Setup failed; the render pipeline was not configured:', error)
    }

    // Deferred, so a StrictMode or Fast Refresh remount (or a dependency change) cancels it by
    // claiming again. A real unmount frees the pipeline and scenePass on the next task.
    return () => {
      if (persistRef.current) currentOwner.mounted = false
      else scheduleRelease(currentOwner)
    }
  }, [store, primary, view, renderer, scene, camera, isLegacy, isOwner, rebuildVersion, resourceVersion, rerun])

  //* Return current state ==============================

  // Subscribe to state changes for reactive updates
  // Both are absent on RootState until a pipeline is created (see types/augment.d.ts).
  const passes = useThree((s) => s.passes) ?? NO_PASSES
  const renderPipeline = useThree((s) => s.renderPipeline) ?? null

  const actions: UseRenderPipelineActions = { passes, clearPasses, reset, rebuild }

  // Two explicit literals rather than `isReady: renderPipeline !== null`, so the discriminated
  // union in UseRenderPipelineReturn is built from a narrowed value instead of asserted.
  if (renderPipeline) return { ...actions, isReady: true, renderPipeline }
  return { ...actions, isReady: false, renderPipeline: null }
}

export default useRenderPipeline
