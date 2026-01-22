import * as React from 'react'
import * as THREE from '#three'
import useMeasure from 'react-use-measure'
import { FiberProvider } from 'its-fine'
import { isRef, Block, ErrorBoundary, useMutableCallback, useIsomorphicLayoutEffect, useBridge } from './utils'
import { extend, createRoot, unmountComponentAtNode, _roots } from './index'
import { createPointerEvents } from './events'
import { notifyAlpha } from './notices'

//* Type Imports ==============================
import type { SetBlock, ReconcilerRoot, DomEvent, CanvasProps } from '#types'

function CanvasImpl({
  ref,
  children,
  fallback,
  resize,
  style,
  gl,
  renderer,
  events = createPointerEvents,
  eventSource,
  eventPrefix,
  shadows,
  linear,
  flat,
  colorSpace,
  toneMapping,
  legacy,
  orthographic,
  frameloop,
  dpr,
  performance,
  raycaster,
  camera,
  scene,
  onPointerMissed,
  onDragOverMissed,
  onDropMissed,
  onCreated,
  hmr,
  width,
  height,
  ...props
}: CanvasProps) {
  // Create a known catalogue of Threejs-native elements
  // This will include the entire THREE namespace by default, users can extend
  // their own elements by using the createRoot API instead
  React.useMemo(() => extend(THREE as any), [])

  const Bridge = useBridge()

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
  const effectiveSize = React.useMemo(
    () => ({
      width: width ?? containerRect.width,
      height: height ?? containerRect.height,
      top: containerRect.top,
      left: containerRect.left,
    }),
    [width, height, containerRect],
  )

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

        await root.current.configure({
          gl,
          renderer,
          scene,
          events,
          shadows,
          linear,
          flat,
          colorSpace,
          toneMapping,
          legacy,
          orthographic,
          frameloop,
          dpr,
          performance,
          raycaster,
          camera,
          size: effectiveSize,
          // Store size props for reset functionality
          _sizeProps: width !== undefined || height !== undefined ? { width, height } : null,
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

        // Bail out if effect was cleaned up while awaiting configure
        if (!effectActiveRef.current || !root.current) return

        root.current.render(
          <Bridge>
            <ErrorBoundary set={setError}>
              <React.Suspense fallback={<Block set={setBlock} />}>{children ?? null}</React.Suspense>
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

  //* HMR Support for TSL Nodes and Uniforms ==============================
  // Automatically refresh nodes/uniforms when HMR is detected (dev mode only)
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
        if (rootEntry?.store) {
          // Clear nodes/uniforms and increment _hmrVersion to trigger creators to re-run
          rootEntry.store.setState((state) => ({
            nodes: {},
            uniforms: {},
            _hmrVersion: state._hmrVersion + 1,
          }))
        }
      })
    }

    // Try Vite HMR
    if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
      const hot = (import.meta as any).hot
      hot.on('vite:afterUpdate', handleHMR)
      // Vite uses dispose() for cleanup, not off()
      return () => hot.dispose?.(() => {})
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
      <div ref={containerRef} className="r3f-canvas-container" style={{ width: '100%', height: '100%' }}>
        <canvas ref={canvasRef} className="r3f-canvas" style={{ display: 'block' }}>
          {fallback}
        </canvas>
      </div>
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
