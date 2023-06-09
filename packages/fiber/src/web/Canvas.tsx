import * as React from 'react'
import * as THREE from 'three'
import useMeasure from 'react-use-measure'
import type { Options as ResizeOptions } from 'react-use-measure'
import { useContextBridge, FiberProvider } from 'its-fine'
import { isRef, SetBlock, Block, ErrorBoundary, useMutableCallback, useIsomorphicLayoutEffect } from '../core/utils'
import { ReconcilerRoot, extend, createRoot, unmountComponentAtNode, RenderProps } from '../core'
import { createPointerEvents } from './events'
import { DomEvent } from '../core/events'

export interface CanvasProps
  extends Omit<RenderProps<HTMLCanvasElement>, 'size'>,
    React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  /** Canvas fallback content, similar to img's alt prop */
  fallback?: React.ReactNode
  /**
   * Options to pass to useMeasure.
   * @see https://github.com/pmndrs/react-use-measure#api
   */
  resize?: ResizeOptions
  /** The target where events are being subscribed to, default: the div that wraps canvas */
  eventSource?: HTMLElement | React.MutableRefObject<HTMLElement>
  /** The event prefix that is cast into canvas pointer x/y events, default: "offset" */
  eventPrefix?: 'offset' | 'client' | 'page' | 'layer' | 'screen'
}

export interface Props extends CanvasProps {}

const CanvasImpl = /*#__PURE__*/ React.forwardRef<HTMLCanvasElement, Props>(function Canvas(
  {
    children,
    fallback,
    resize,
    style,
    gl,
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
    onPointerMissed,
    onCreated,
    ...props
  },
  forwardedRef,
) {
  // Create a known catalogue of Threejs-native elements
  // This will include the entire THREE namespace by default, users can extend
  // their own elements by using the createRoot API instead
  React.useMemo(() => extend(THREE), [])

  const Bridge = useContextBridge()

  const [containerRef, containerRect] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const canvasRef = React.useRef<HTMLCanvasElement>(null!)
  const divRef = React.useRef<HTMLDivElement>(null!)
  React.useImperativeHandle(forwardedRef, () => canvasRef.current)

  const handlePointerMissed = useMutableCallback(onPointerMissed)
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within canvas throws
  if (error) throw error

  const root = React.useRef<ReconcilerRoot<HTMLCanvasElement>>(null!)

  useIsomorphicLayoutEffect(() => {
    const canvas = canvasRef.current
    if (containerRect.width > 0 && containerRect.height > 0 && canvas) {
      if (!root.current) root.current = createRoot<HTMLCanvasElement>(canvas)
      root.current.configure({
        gl,
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
      root.current.render(
        <Bridge>
          <ErrorBoundary set={setError}>
            <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
          </ErrorBoundary>
        </Bridge>,
      )
    }
  })

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) return () => unmountComponentAtNode(canvas)
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
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }}>
          {fallback}
        </canvas>
      </div>
    </div>
  )
})

/**
 * A DOM canvas which accepts threejs elements as children.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export const Canvas = React.forwardRef<HTMLCanvasElement, Props>(function CanvasWrapper(props, ref) {
  return (
    <FiberProvider>
      <CanvasImpl {...props} ref={ref} />
    </FiberProvider>
  )
})
