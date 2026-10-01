import * as React from 'react'
import useMeasure from 'react-use-measure'
import { FiberProvider } from 'its-fine'
import { isRef, Block, ErrorBoundary, useMutableCallback, useIsomorphicLayoutEffect, useBridge } from '../core/utils'
import { useGate } from '../core/utils/react'
import { createRoot, _roots } from '../core/root'
import { createPointerEvents } from '../core/events'
import { notifyAlpha } from '../core/utils/notices'
import { Environment } from '../core/components/Environment/Environment'
import { parseBackground } from '../core/utils/parseBackground'
import { DEFAULT_PRIMARY, announcePrimary, markWithdrawing, withdrawPrimary } from '../core/renderer'
import { notifyRootExtensionsHmr } from '../core/extensions'

//* Type Imports ==============================
import type { SetBlock, ReconcilerRoot, DomEvent, CanvasProps, RendererProvider, RootState } from '#types'

/** The renderer provider of the entry that exported this Canvas. Not part of the public props. */
export interface CanvasProviderProps {
  provider: RendererProvider
}

function CanvasImpl({
  ref,
  children,
  fallback,
  resize,
  style,
  id,
  gl,
  renderer,
  primary,
  share,
  scheduler,
  events = createPointerEvents,
  eventSource,
  eventPrefix,
  orthographic,
  frameloop,
  dpr,
  performance,
  raycaster,
  camera,
  scene,
  autoUpdateFrustum,
  occlusion,
  onPointerMissed,
  onDragOverMissed,
  onDropMissed,
  onCreated,
  hmr,
  width,
  height,
  background,
  forceEven,
  provider,
  ...props
}: CanvasProps & CanvasProviderProps) {
  // Props v10 removed: kept off the <div> and handed to configure(), which throws naming the new API
  const {
    shadows: removedShadows,
    primaryCanvas: removedPrimaryCanvas,
    ...divProps
  } = props as typeof props & {
    shadows?: unknown
    primaryCanvas?: unknown
  }
  const Bridge = useBridge()

  //* Background Prop Parsing ==============================
  // Parse background prop into Environment-compatible props (see ./utils/parseBackground)
  const backgroundProps = React.useMemo(() => parseBackground(background), [background])

  //* Dynamic Debounce for Fast Initial Render ==============================
  const [hasInitialSize, setHasInitialSize] = React.useState(false)

  // Create measure config with immediate initial measurement (0ms debounce)
  // After first size, we'll use user-provided debounce for subsequent updates
  const measureConfig = React.useMemo(() => {
    if (!hasInitialSize) {
      // First measurement: use 0ms debounce for immediate rendering
      return {
        ...resize,
        scroll: resize?.scroll ?? true,
        debounce: 0,
      }
    }
    // Subsequent measurements: use user-provided debounce
    return {
      scroll: true,
      debounce: { scroll: 50, resize: 0 },
      ...resize,
    }
  }, [hasInitialSize, resize])

  const [containerRef, containerRect] = useMeasure(measureConfig)

  // Compute effective size: props override container measurement
  const effectiveSize = React.useMemo(() => {
    let w = width ?? containerRect.width
    let h = height ?? containerRect.height
    if (forceEven) {
      w = Math.ceil(w / 2) * 2
      h = Math.ceil(h / 2) * 2
    }
    return {
      width: w,
      height: h,
      top: containerRect.top,
      left: containerRect.left,
    }
  }, [width, height, containerRect, forceEven])

  // Restart this render with the steady-state config as soon as the immediate
  // measurement succeeds. This happens before effects commit, so Canvas setup
  // still runs only once for this size change.
  if (!hasInitialSize && effectiveSize.width > 0 && effectiveSize.height > 0) setHasInitialSize(true)
  const canvasRef = React.useRef<HTMLCanvasElement>(null!)
  const divRef = React.useRef<HTMLDivElement>(null!)
  React.useImperativeHandle(ref, () => canvasRef.current)

  const handlePointerMissed = useMutableCallback(onPointerMissed)
  const handleDragOverMissed = useMutableCallback(onDragOverMissed)
  const handleDropMissed = useMutableCallback(onDropMissed)
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)
  // Set when renderer setup fails and a `fallback` should be shown as visible DOM (#3757)
  const [fallbackVisible, setFallbackVisible] = React.useState(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within canvas throws
  if (error) throw error

  const root = React.useRef<ReconcilerRoot<HTMLCanvasElement>>(null!)
  const [gate, waitFor] = useGate()
  const rootState = React.useRef<RootState | null>(null)
  const eventTarget = () => (eventSource ? (isRef(eventSource) ? eventSource.current : eventSource) : divRef.current)
  const pointerMissed = React.useCallback(
    (...args: Parameters<NonNullable<typeof onPointerMissed>>) => handlePointerMissed.current?.(...args),
    [handlePointerMissed],
  )
  const dragOverMissed = React.useCallback(
    (...args: Parameters<NonNullable<typeof onDragOverMissed>>) => handleDragOverMissed.current?.(...args),
    [handleDragOverMissed],
  )
  const dropMissed = React.useCallback(
    (...args: Parameters<NonNullable<typeof onDropMissed>>) => handleDropMissed.current?.(...args),
    [handleDropMissed],
  )

  useIsomorphicLayoutEffect(() => {
    // A prior renderer setup failed and we're showing the fallback DOM; don't re-attempt.
    if (fallbackVisible) return
    const canvas = canvasRef.current

    if (effectiveSize.width > 0 && effectiveSize.height > 0 && canvas) {
      if (!root.current) {
        root.current = createRoot<HTMLCanvasElement>(canvas, provider)

        // Show alpha warning once per session
        notifyAlpha({
          message: 'React Three Fiber v10 is in ALPHA - expect breaking changes',
          link: 'https://github.com/pmndrs/react-three-fiber/discussions',
        })
      }

      const current = root.current
      current
        .configure({
          id,
          primary,
          share,
          scheduler,
          gl,
          renderer,
          scene,
          events,
          _primaryToken: primaryToken,
          ...({ shadows: removedShadows, primaryCanvas: removedPrimaryCanvas } as {}),
          orthographic,
          frameloop,
          dpr,
          performance,
          raycaster,
          camera,
          autoUpdateFrustum,
          occlusion,
          size: effectiveSize,
          // Store size props for reset functionality
          _sizeProps: width !== undefined || height !== undefined ? { width, height } : null,
          forceEven,
          // Pass mutable reference to onPointerMissed so it's free to update
          onPointerMissed: pointerMissed,
          onDragOverMissed: dragOverMissed,
          onDropMissed: dropMissed,
          onCreated: (state) => {
            rootState.current = state
            // Connect to event source
            state.events.connect?.(eventTarget() ?? divRef.current)
            // Set up compute function
            if (eventPrefix) {
              state.setEvents({
                compute: (event, state) => {
                  const x = event[(eventPrefix + 'X') as keyof DomEvent] as number
                  const y = event[(eventPrefix + 'Y') as keyof DomEvent] as number
                  state.pointer.set((x / state.size.width) * 2 - 1, -(y / state.size.height) * 2 + 1)
                  state.raycaster.setFromCamera(state.pointer, state.camera)
                },
              })
            }
            // Call onCreated callback
            onCreated?.(state)
          },
        })
        .catch((setupError) => {
          // Ignore a result belonging to a Canvas that was finally removed.
          if (root.current !== current) return
          if (fallback != null) setFallbackVisible(true)
          else setError(setupError)
        })

      if (current.ready.status === 'fulfilled') {
        current.render(
          <Bridge>
            <ErrorBoundary set={setError}>
              <React.Suspense fallback={<Block set={setBlock} />}>
                {backgroundProps && <Environment {...backgroundProps} />}
                {children ?? null}
              </React.Suspense>
            </ErrorBoundary>
          </Bridge>,
        )
      } else if (current.ready.status === 'pending') {
        waitFor(current.ready)
      }
    }
  })

  // Scene errors belong to the root; this subscription follows Canvas effect connectivity.
  useIsomorphicLayoutEffect(() => {
    const store = canvasRef.current && _roots.get(canvasRef.current)?.store
    if (!store) return
    const report = () => {
      const error = store.getState().error
      if (error) setError(error)
    }
    report()
    return store.subscribe(report)
  })

  // Ancestor refs attach after Canvas's layout effect.
  React.useEffect(() => {
    const state = rootState.current?.get()
    const target = eventTarget()
    if (state && target && state.events.connected !== target) state.events.connect?.(target)
  })

  // Insertion effects survive Activity hiding and StrictMode effect replay: their cleanup runs only
  // when the Canvas is finally removed, including removal while an Activity hides it (React 19.2+),
  // when its passive effects are already gone and the cleanup below never runs again
  //
  // A `<Canvas primary>` announces itself here, synchronously on mount: insertion effects run for the
  // whole commit before any layout effect, so a canvas configuring in the same commit (whatever its
  // place in the tree) already sees the primary coming and waits to share its renderer instead of
  // building its own. Read once at mount, like the renderer itself; configure() continues the
  // announcement under the same token.
  const insertionMounted = React.useRef(false)
  const [primaryToken] = React.useState(() => ({}))
  const primaryKey = React.useRef<string | null>(null)
  React.useInsertionEffect(() => {
    insertionMounted.current = true
    if (primary && provider.webgpu) {
      primaryKey.current ??= id || DEFAULT_PRIMARY
      announcePrimary(primaryKey.current, primaryToken)
    }
    return () => {
      insertionMounted.current = false
      // A primary about to go stops counting for new canvases now, but only withdraws below
      if (primaryKey.current) markWithdrawing(primaryToken)
      // Fast Refresh replays this effect when Canvas.tsx is edited, running the setup right after
      // this cleanup in the same commit. Only a cleanup nothing re-armed is a real removal
      queueMicrotask(() => {
        if (insertionMounted.current) return
        if (primaryKey.current) withdrawPrimary(primaryKey.current, primaryToken)
        // Through the root handle: a hidden Activity has already detached canvasRef
        const current = root.current
        root.current = null!
        current?.unmount()
      })
    }
    // Mount-time values on purpose: a primary is decided when its renderer is created
  }, [])

  // Before 19.2, React skips insertion cleanups in a subtree Suspense has hidden but still runs
  // passive ones, so this cleanup releases a Canvas that left the document in that case
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      return () => {
        // Only tear the root down once the canvas has actually left the document.
        //
        // This cleanup runs whenever CanvasImpl's passive effects are destroyed, which is NOT
        // the same as CanvasImpl being unmounted. React also destroys them when a Suspense
        // boundary hides the tree, and StrictMode exercises that path on every mount.
        //
        // That matters because any child suspending — a useTexture/useLoader with no <Suspense>
        // of its own — reaches CanvasImpl through `Block`, which deliberately lifts the promise
        // out to the boundary *outside* the Canvas so the DOM-level `fallback` can show. The
        // blast radius was the problem, not the lift: the resource-owning root was destroyed to
        // display a fallback for one texture, and everything created inside it went with it. For
        // scenes that only draw that is an invisible flash; for anything accumulating state on
        // the GPU (useGPUStorage) it is silent data loss, with `R3F.createRoot should only be
        // called once!` as the only clue. See #3850.
        //
        // React detaches the host node before running these cleanups on a real unmount, so
        // `isConnected` separates the two cases. Both directions are covered by tests — a
        // suspension must keep the root, and a real unmount must still release it.
        if (canvas.isConnected) return

        // A later setup builds a new root rather than using the released one
        const current = root.current
        root.current = null!
        current?.unmount()
      }
    }
  }, [])

  //* HMR Support ==============================
  // Forward hot updates to root extensions (e.g. the TSL hooks refresh nodes/uniforms/buffers/
  // gpuStorage). Dev mode only; can be disabled with hmr={false} prop
  React.useEffect(() => {
    // Skip if explicitly disabled
    if (hmr === false) return

    const canvas = canvasRef.current
    if (!canvas) return

    // HMR refresh handler - lets each extension that set this root up refresh its state
    // Uses queueMicrotask to defer setState out of any current render cycle,
    // avoiding "Cannot update a component while rendering" errors
    const handleHMR = () => {
      queueMicrotask(() => {
        const rootEntry = _roots.get(canvas)
        if (rootEntry?.store) notifyRootExtensionsHmr(rootEntry.store)
      })
    }

    // Try Vite HMR
    if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
      const hot = (import.meta as any).hot
      hot.on('vite:afterUpdate', handleHMR)
      return () => hot.off?.('vite:afterUpdate', handleHMR)
    }

    // Try webpack HMR
    if (typeof module !== 'undefined' && (module as any).hot) {
      const hot = (module as any).hot
      hot.addStatusHandler((status: string) => {
        if (status === 'idle') handleHMR()
      })
      // Webpack doesn't have a clean way to remove status handlers, so no cleanup
    }
  }, [hmr])

  // When the event source is not this div, we need to set pointer-events to none
  // Or else the canvas will block events from reaching the event source
  const pointerEvents = eventSource ? 'none' : 'auto'

  return (
    <div
      ref={divRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents,
        ...style,
      }}
      {...divProps}>
      {fallbackVisible ? (
        // Renderer setup failed: render the fallback as visible DOM. Inside <canvas> (below)
        // it exists in the tree but browsers never paint it, which is the whole bug (#3757).
        fallback
      ) : (
        <div ref={containerRef} className="r3f-canvas-container" style={{ width: '100%', height: '100%' }}>
          <canvas
            ref={canvasRef}
            id={id}
            className="r3f-canvas"
            style={{ display: 'block', width: '100%', height: '100%' }}>
            {fallback}
          </canvas>
        </div>
      )}
      {gate}
    </div>
  )
}

/**
 * A DOM canvas which accepts threejs elements as children. Each public entry exports this bound to
 * its renderer provider; app code renders `<Canvas>` from `@react-three/fiber` (or `/legacy`, `/webgpu`).
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export function Canvas(props: CanvasProps & CanvasProviderProps) {
  return (
    <FiberProvider>
      <CanvasImpl {...props} />
    </FiberProvider>
  )
}
