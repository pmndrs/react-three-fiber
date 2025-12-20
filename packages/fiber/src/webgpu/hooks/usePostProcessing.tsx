import { useLayoutEffect, useRef, useCallback, useState } from 'react'
import { useStore, useThree } from '../../core/hooks'
import * as THREE from '#three'
import { pass } from '#three/tsl'

// Types are declared globally in types/postprocessing.d.ts:
// - PassRecord
// - PostProcessingSetupCallback
// - PostProcessingMainCallback
// - UsePostProcessingReturn

//* Hook Implementation ==============================

/**
 * Hook for managing WebGPU PostProcessing with automatic scenePass setup.
 *
 * Features:
 * - Creates PostProcessing instance if not exists
 * - Creates default scenePass (no MRT) automatically
 * - Callbacks receive full RootState for flexibility
 * - No auto-cleanup on unmount - use reset() for explicit cleanup
 * - Scene/camera changes trigger scenePass recreation
 *
 * @param mainCB - Main callback to configure outputNode and create effect passes
 * @param setupCB - Optional setup callback to configure MRT on scenePass
 * @returns { passes, postProcessing, clearPasses, reset, rebuild }
 *
 * @example
 * ```tsx
 * // Simple effect
 * usePostProcessing(({ postProcessing, passes }) => {
 *   postProcessing.outputNode = bloom(passes.scenePass.getTextureNode())
 * })
 *
 * // With MRT setup
 * usePostProcessing(
 *   ({ postProcessing, passes }) => {
 *     const beauty = passes.scenePass.getTextureNode().toInspector('Color')
 *     const vel = passes.scenePass.getTextureNode('velocity')
 *     postProcessing.outputNode = motionBlur(beauty, vel)
 *   },
 *   ({ passes }) => {
 *     passes.scenePass.setMRT(mrt({ output, velocity }))
 *   }
 * )
 *
 * // Read-only access
 * const { postProcessing, passes } = usePostProcessing()
 * ```
 */
export function usePostProcessing(
  mainCB?: PostProcessingMainCallback,
  setupCB?: PostProcessingSetupCallback,
): UsePostProcessingReturn {
  const store = useStore()
  const { scene, camera, renderer, isLegacy } = useThree()

  // Track if we've warned about multiple calls
  const hasWarnedRef = useRef(false)

  // Track if this instance initialized the PostProcessing
  const didInitializeRef = useRef(false)

  // Store callbacks in refs to avoid useEffect re-running on every render
  // (inline callbacks get new references each render)
  const mainCBRef = useRef(mainCB)
  const setupCBRef = useRef(setupCB)
  mainCBRef.current = mainCB
  setupCBRef.current = setupCB

  // Rebuild trigger - increment to force effect re-run
  const [rebuildVersion, setRebuildVersion] = useState(0)

  //* Cleanup Functions ==============================

  const clearPasses = useCallback(() => {
    store.setState({ passes: {} })
  }, [store])

  const reset = useCallback(() => {
    store.setState({
      postProcessing: null,
      passes: {},
    })
    didInitializeRef.current = false
  }, [store])

  // Force re-run of setup/main callbacks with current closure values
  const rebuild = useCallback(() => {
    setRebuildVersion((v) => v + 1)
  }, [])

  //* Main Effect - Setup PostProcessing ==============================
  // useLayoutEffect runs synchronously BEFORE browser paint
  // This ensures MRT is configured before the first render frame

  useLayoutEffect(() => {
    // WebGPU only - throw if used with WebGL
    if (isLegacy) {
      throw new Error('usePostProcessing is only available with WebGPU renderer. Set renderer prop on Canvas.')
    }

    if (!renderer || !scene || !camera) return

    const state = store.getState()
    const set = store.setState

    try {
      let pp = state.postProcessing as THREE.PostProcessing | null
      let currentPasses = { ...state.passes } as PassRecord

      //* Create PostProcessing if not exists ==============================
      if (!pp) {
        pp = new THREE.PostProcessing(renderer as THREE.WebGPURenderer)
        didInitializeRef.current = true
      } else if (!hasWarnedRef.current && (mainCBRef.current || setupCBRef.current)) {
        // Warn if another component already configured PP
        console.warn(
          '[usePostProcessing] PostProcessing already exists. Multiple components configuring PP may cause unexpected behavior.',
        )
        hasWarnedRef.current = true
      }

      //* Create/Update default scenePass ==============================
      // Always recreate scenePass when scene/camera changes
      const scenePass = pass(scene, camera)
      currentPasses.scenePass = scenePass

      // Set default outputNode (passthrough) if not configured
      if (!pp.outputNode || didInitializeRef.current) {
        pp.outputNode = scenePass
      }

      // Update state with PP and initial scenePass
      set({ postProcessing: pp, passes: currentPasses })

      //* Run setupCB (MRT configuration) ==============================
      // IMPORTANT: setupCB runs first so MRT is configured before any rendering
      if (setupCBRef.current) {
        // Get fresh state with updated passes
        const freshState = store.getState()
        const setupResult = setupCBRef.current(freshState)

        if (setupResult && typeof setupResult === 'object') {
          currentPasses = { ...currentPasses, ...setupResult }
          set({ passes: currentPasses })
        }
      }

      //* Run mainCB ==============================
      if (mainCBRef.current) {
        // Get fresh state with all passes
        const freshState = store.getState()
        const mainResult = mainCBRef.current(freshState)

        if (mainResult && typeof mainResult === 'object') {
          currentPasses = { ...currentPasses, ...mainResult }
          set({ passes: currentPasses })
        }
      }
    } catch (error) {
      console.error('[usePostProcessing] Setup error:', error)
    }

    // No auto-cleanup on unmount - PostProcessing persists
  }, [store, renderer, scene, camera, isLegacy, rebuildVersion]) // Callbacks accessed via refs; rebuildVersion triggers manual re-run

  //* Return current state ==============================

  // Subscribe to state changes for reactive updates
  const passes = useThree((s) => s.passes)
  const postProcessing = useThree((s) => s.postProcessing)

  return {
    passes,
    postProcessing,
    clearPasses,
    reset,
    rebuild,
    // isReady indicates if PostProcessing is configured and ready for rendering
    isReady: postProcessing !== null,
  }
}

export default usePostProcessing
