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
} from '../core/utils'
import { ReconcilerRoot, extend, createRoot, unmountComponentAtNode, RenderProps } from '../core'
import { RootStore } from '../core/store'
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
  eventSource?: HTMLElement | React.RefObject<HTMLElement>
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
  const containerElementRef = React.useRef<HTMLElement>(null!)
  React.useImperativeHandle(ref, () => canvasRef.current)

  const handlePointerMissed = useMutableCallback(onPointerMissed)
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within canvas throws
  if (error) throw error

  const root = React.useRef<ReconcilerRoot<HTMLCanvasElement>>(null!)
  const store = React.useRef<RootStore>(null!)

  useIsomorphicLayoutEffect(() => {
    const canvas = canvasRef.current
    if (containerRect.width > 0 && containerRect.height > 0 && canvas) {
      if (!root.current) root.current = createRoot<HTMLCanvasElement>(canvas)

      async function run() {
        await root.current.configure({
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
        store.current = root.current.render(
          <Bridge>
            <ErrorBoundary set={setError}>
              <React.Suspense fallback={<Block set={setBlock} />}>{children ?? null}</React.Suspense>
            </ErrorBoundary>
          </Bridge>,
        )
      }
      run()
    }
  })

  // Continuously check container size on each frame to handle smooth CSS transitions
  // ResizeObserver may not fire frequently enough during transitions, causing rendering to snap
  React.useEffect(() => {
    if (!store.current) return

    let frameId: number
    const checkSize = () => {
      const container = containerElementRef.current
      if (container && store.current) {
        const rect = container.getBoundingClientRect()
        const state = store.current.getState()
        // Only update if size actually changed to avoid unnecessary renders
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          (Math.abs(state.size.width - rect.width) > 0.5 ||
            Math.abs(state.size.height - rect.height) > 0.5 ||
            Math.abs(state.size.top - rect.top) > 0.5 ||
            Math.abs(state.size.left - rect.left) > 0.5)
        ) {
          state.setSize(rect.width, rect.height, rect.top, rect.left)
        }
      }
      frameId = requestAnimationFrame(checkSize)
    }

    frameId = requestAnimationFrame(checkSize)
    return () => cancelAnimationFrame(frameId)
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
      <div
        ref={(el) => {
          containerRef(el)
          if (el) containerElementRef.current = el
        }}
        style={{ width: '100%', height: '100%' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }}>
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
