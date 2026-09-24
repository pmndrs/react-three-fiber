import * as React from 'react'
import * as THREE from 'three'
import useMeasure, { Options as ResizeOptions } from 'react-use-measure'
import { FiberProvider } from 'its-fine'
import {
  isRef,
  SetBlock,
  Block,
  ErrorBoundary,
  useMutableCallback,
  useIsomorphicLayoutEffect,
  useBridge,
  useGate,
} from '../core/utils'
import { ReconcilerRoot, extend, createRoot, RenderProps, RootState } from '../core'
import { createPointerEvents } from './events'
import { DomEvent } from '../core/events'

export interface CanvasProps
  extends Omit<RenderProps<HTMLCanvasElement>, 'size'>,
    React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  ref?: React.Ref<HTMLCanvasElement>
  /** Canvas fallback content, similar to img's alt prop */
  fallback?: React.ReactNode
  /**
   * Options to pass to useMeasure.
   * @see https://github.com/pmndrs/react-use-measure#api
   */
  resize?: ResizeOptions
  /** The target where events are being subscribed to, default: the div that wraps canvas */
  eventSource?: HTMLElement | React.RefObject<HTMLElement | null>
  /** The event prefix that is cast into canvas pointer x/y events, default: "offset" */
  eventPrefix?: 'offset' | 'client' | 'page' | 'layer' | 'screen'
}

function CanvasImpl({
  ref,
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
  scene,
  onPointerMissed,
  onCreated,
  ...props
}: CanvasProps) {
  // Create a known catalogue of Threejs-native elements
  // This will include the entire THREE namespace by default, users can extend
  // their own elements by using the createRoot API instead
  React.useMemo(() => extend(THREE as any), [])

  const Bridge = useBridge()

  const [containerRef, containerRect] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const canvasRef = React.useRef<HTMLCanvasElement>(null!)
  const divRef = React.useRef<HTMLDivElement>(null!)
  React.useImperativeHandle(ref, () => canvasRef.current)

  const handlePointerMissed = useMutableCallback(onPointerMissed)
  const pointerMissed = React.useCallback(
    (event: MouseEvent) => handlePointerMissed.current?.(event),
    [handlePointerMissed],
  )
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within canvas throws
  if (error) throw error

  const root = React.useRef<ReconcilerRoot<HTMLCanvasElement> | null>(null)

  // Waits for an async renderer without hiding the canvas
  const [gate, waitFor] = useGate()
  const rootState = React.useRef<RootState>(null)
  const eventTarget = () => (eventSource ? (isRef(eventSource) ? eventSource.current : eventSource) : divRef.current)

  // Insertion effects survive Activity hiding and StrictMode effect replay. Only
  // final removal releases the root, including removal while hidden from React 19.2
  React.useInsertionEffect(() => {
    return () => {
      const current = root.current
      root.current = null
      current?.unmount()
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    const canvas = canvasRef.current
    if (containerRect.width > 0 && containerRect.height > 0 && canvas) {
      if (!root.current) root.current = createRoot<HTMLCanvasElement>(canvas)

      root.current
        .configure({
          gl,
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
          // Forwards to the latest onPointerMissed, so a new callback does not update the store
          onPointerMissed: pointerMissed,
          onCreated: (state) => {
            rootState.current = state
            // A ref to an ancestor is not attached yet. The effect below settles it
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
        .catch(setError)

      // Pending re-runs this effect once the renderer lands. Rejected is reported by the catch
      if (root.current.ready.status === 'fulfilled') {
        root.current.render(
          <Bridge>
            <ErrorBoundary set={setError}>
              <React.Suspense fallback={<Block set={setBlock} />}>{children ?? null}</React.Suspense>
            </ErrorBoundary>
          </Bridge>,
        )
      } else if (root.current.ready.status === 'pending') {
        waitFor(root.current.ready)
      }
    }
  })

  // Refs on ancestors attach after our layout effect
  React.useEffect(() => {
    const state = rootState.current?.get()
    const target = eventTarget()
    if (state && target && state.events.connected !== target) state.events.connect?.(target)
  })

  // Before 19.2, React skips insertion cleanups in a subtree Suspense has hidden but keeps its
  // passive effects connected. A canvas that left the document was removed rather than hidden
  React.useEffect(() => {
    const canvas = canvasRef.current
    return () => {
      if (!canvas.isConnected) root.current?.unmount()
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
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }}>
          {fallback}
        </canvas>
      </div>
      {gate}
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
