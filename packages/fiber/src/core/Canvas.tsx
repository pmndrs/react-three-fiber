import * as React from 'react'
import * as THREE from '#three'
import useMeasure from 'react-use-measure'
import { FiberProvider } from 'its-fine'
import { isRef, Block, ErrorBoundary, useMutableCallback, useIsomorphicLayoutEffect, useBridge } from './utils'
import { extend, createRoot, unmountComponentAtNode, _roots } from './index'
import { createPointerEvents } from './events'
import { notifyAlpha } from './utils/notices'
import { Environment } from './components/Environment/Environment'
import { parseBackground } from './utils/parseBackground'
import { parseRendererConfig } from './utils/parseRendererConfig'
import { clearHmrCaches } from './utils/hmr'

//* Type Imports ==============================
import type { SetBlock, ReconcilerRoot, DomEvent, CanvasProps } from '#types'

function CanvasImpl({
  ref,
  children,
  fallback,
  resize,
  style,
  id,
  gl,
  renderer: rendererProp,
  events = createPointerEvents,
  eventSource,
  eventPrefix,
  shadows,
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
  ...props
}: CanvasProps) {
  // Extract nested props (primaryCanvas, scheduler) from renderer object if it's a config bag rather than a renderer instance
  const { primaryCanvas, scheduler, renderer } = parseRendererConfig(rendererProp)
  // Create a known catalogue of Threejs-native elements
  // This will include the entire THREE namespace by default, users can extend
  // their own elements by using the createRoot API instead
  React.useMemo(() => extend(THREE as any), [])

  const Bridge = useBridge()

  //* Background Prop Parsing ==============================
  // Parse background prop into Environment-compatible props (see ./utils/parseBackground)
  const backgroundProps = React.useMemo(() => parseBackground(background), [background])

  //* Dynamic Debounce for Fast Initial Render ==============================
  // Track if we've gotten initial size measurement
  const hasInitialSizeRef = React.useRef(false)

  // Create measure config with immediate initial measurement (0ms debounce)
  // After first size, we'll use user-provided debounce for subsequent updates
  const measureConfig = React.useMemo(() => {
    if (!hasInitialSizeRef.current) {
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
  }, [resize, hasInitialSizeRef.current]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Mark that we have initial size (for next render cycle)
  if (!hasInitialSizeRef.current && effectiveSize.width > 0 && effectiveSize.height > 0) {
    hasInitialSizeRef.current = true
  }
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
  // Track if the current effect is still active (for async operations during HMR)
  const effectActiveRef = React.useRef(true)
  // Store subscription cleanup function
  const unsubscribeErrorRef = React.useRef<(() => void) | null>(null)

  useIsomorphicLayoutEffect(() => {
    effectActiveRef.current = true
    // A prior renderer setup failed and we're showing the fallback DOM; don't re-attempt.
    if (fallbackVisible) return
    const canvas = canvasRef.current

    if (effectiveSize.width > 0 && effectiveSize.height > 0 && canvas) {
      if (!root.current) {
        root.current = createRoot<HTMLCanvasElement>(canvas)

        // Show alpha warning once per session
        notifyAlpha({
          message: 'React Three Fiber v10 is in ALPHA - expect breaking changes',
          link: 'https://github.com/pmndrs/react-three-fiber/discussions',
        })

        //* Set up error subscription immediately after createRoot ==============================
        // This ensures error propagation is ready BEFORE configure() starts the RAF loop.
        // If we wait until after configure() and render(), errors in useFrame callbacks
        // might occur before the subscription is established.
        // @see https://github.com/pmndrs/react-three-fiber/issues/3651
        const rootEntry = _roots.get(canvas)
        if (rootEntry?.store) {
          // Clean up any previous subscription
          if (unsubscribeErrorRef.current) unsubscribeErrorRef.current()

          unsubscribeErrorRef.current = rootEntry.store.subscribe((state) => {
            if (state.error && effectActiveRef.current) {
              setError(state.error)
            }
          })
        }
      }

      async function run() {
        // Bail out if effect was cleaned up while awaiting (HMR race condition)
        if (!effectActiveRef.current || !root.current) return

        const configured = await root.current
          .configure({
            id,
            primaryCanvas,
            scheduler,
            gl,
            renderer,
            scene,
            events,
            shadows,
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
            onPointerMissed: (...args) => handlePointerMissed.current?.(...args),
            onDragOverMissed: (...args) => handleDragOverMissed.current?.(...args),
            onDropMissed: (...args) => handleDropMissed.current?.(...args),
            onCreated: (state) => {
              // Connect to event source
              state.events.connect?.(
                eventSource ? (isRef(eventSource) ? eventSource.current : eventSource) : divRef.current,
              )
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
          .then(
            () => true,
            // Renderer setup failed (e.g. no WebGL/WebGPU support). The `fallback` prop lives
            // inside <canvas>, which browsers don't display, so surface it as visible DOM
            // instead; with no fallback, rethrow to an external error boundary. (#3757)
            (setupError) => {
              if (effectActiveRef.current) {
                if (fallback != null) setFallbackVisible(true)
                else setError(setupError)
              }
              return false
            },
          )

        // Bail out if setup failed or the effect was cleaned up while awaiting configure
        if (!configured || !effectActiveRef.current || !root.current) return

        root.current.render(
          <Bridge>
            <ErrorBoundary set={setError}>
              <React.Suspense fallback={<Block set={setBlock} />}>
                {backgroundProps && <Environment {...backgroundProps} />}
                {children ?? null}
              </React.Suspense>
            </ErrorBoundary>
          </Bridge>,
        )
        // Note: Error subscription is set up synchronously in the parent scope
        // immediately after createRoot() to ensure it's ready before RAF starts.
      }
      run()
    }

    // Cleanup: mark effect as inactive to cancel pending async operations
    return () => {
      effectActiveRef.current = false
      if (unsubscribeErrorRef.current) {
        unsubscribeErrorRef.current()
        unsubscribeErrorRef.current = null
      }
    }
  })

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      return () => {
        unmountComponentAtNode(canvas)
        // Clear root ref so HMR creates a fresh root
        root.current = null!
      }
    }
  }, [])

  //* HMR Support for TSL Resources ==============================
  // Automatically refresh nodes/uniforms/buffers/gpuStorage when HMR is detected (dev mode only)
  // Can be disabled with hmr={false} prop
  React.useEffect(() => {
    // Skip if explicitly disabled
    if (hmr === false) return

    const canvas = canvasRef.current
    if (!canvas) return

    // HMR refresh handler - clears caches and bumps version to trigger re-creation
    // Uses queueMicrotask to defer setState out of any current render cycle,
    // avoiding "Cannot update a component while rendering" errors
    const handleHMR = () => {
      queueMicrotask(() => {
        const rootEntry = _roots.get(canvas)
        if (rootEntry?.store) clearHmrCaches(rootEntry.store)
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
      {...props}>
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
    </div>
  )
}

/**
 * A DOM canvas which accepts threejs elements as children.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export function Canvas(props: CanvasProps) {
  return (
    <FiberProvider>
      <CanvasImpl {...props} />
    </FiberProvider>
  )
}
