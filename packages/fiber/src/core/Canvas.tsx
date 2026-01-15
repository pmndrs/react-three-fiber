import * as React from 'react'
import * as THREE from '#three'
import useMeasure from 'react-use-measure'
import { FiberProvider } from 'its-fine'
import { isRef, Block, ErrorBoundary, useMutableCallback, useIsomorphicLayoutEffect, useBridge } from './utils'
import { extend, createRoot, unmountComponentAtNode } from './index'
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

  // Mark that we have initial size (for next render cycle)
  if (!hasInitialSizeRef.current && containerRect.width > 0 && containerRect.height > 0) {
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

    if (containerRect.width > 0 && containerRect.height > 0 && canvas) {
      if (!root.current) {
        root.current = createRoot<HTMLCanvasElement>(canvas)

        // Show alpha warning once per session
        notifyAlpha({
          message: 'React Three Fiber v10 is in ALPHA - expect breaking changes',
          link: 'https://github.com/pmndrs/react-three-fiber/discussions',
        })
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
          legacy,
          orthographic,
          frameloop,
          dpr,
          performance,
          raycaster,
          camera,
          size: containerRect,
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

        const store = root.current.render(
          <Bridge>
            <ErrorBoundary set={setError}>
              <React.Suspense fallback={<Block set={setBlock} />}>{children ?? null}</React.Suspense>
            </ErrorBoundary>
          </Bridge>,
        )

        // Clean up previous subscription if it exists
        if (unsubscribeErrorRef.current) unsubscribeErrorRef.current()

        // Subscribe to store error state and propagate to error boundary
        unsubscribeErrorRef.current = store.subscribe((state) => {
          if (state.error && effectActiveRef.current) {
            setError(state.error)
          }
        })
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
